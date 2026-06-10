<?php

namespace App\Service\Webservice;

use Anthropic\Client as AnthropicClient;
use Anthropic\Messages\CacheControlEphemeral;
use Anthropic\Messages\InputJSONDelta;
use Anthropic\Messages\MessageParam;
use Anthropic\Messages\RawContentBlockDeltaEvent;
use Anthropic\Messages\RawContentBlockStartEvent;
use Anthropic\Messages\RawMessageDeltaEvent;
use Anthropic\Messages\TextBlock;
use Anthropic\Messages\TextBlockParam;
use Anthropic\Messages\TextDelta;
use Anthropic\Messages\Tool;
use Anthropic\Messages\ToolResultBlockParam;
use Anthropic\Messages\ToolUseBlock;
use Anthropic\Messages\ToolUseBlockParam;

/**
 * Anthropic Messages API provider using the official SDK.
 * Handles one-shot, multi-turn, and streaming for Claude models,
 * including client-side tool use (function calling).
 */
class AnthropicProvider implements AiProviderInterface
{
    /** Max tool-use rounds per request, to avoid loops. */
    private const MAX_TOOL_ROUNDS = 3;

    private AnthropicClient $client;

    public function __construct(string $apiKey)
    {
        $this->client = new AnthropicClient(apiKey: $apiKey);
    }

    public function call(string $model, string $input, ?string $instructions = null, ?int $maxTokens = null): array
    {
        $jsonExpected = $instructions && (
            stripos($instructions, 'JSON') !== false
            || stripos($instructions, 'json') !== false
        );

        $messages = [MessageParam::with(content: $input, role: 'user')];

        // Prefill technique: force Claude to start outputting JSON
        if ($jsonExpected) {
            $messages[] = MessageParam::with(content: '{', role: 'assistant');
        }

        try {
            $response = $this->client->messages->create(
                maxTokens: $maxTokens ?? 8192,
                messages: $messages,
                model: $model,
                system: $instructions,
            );

            $outputText = $this->extractText($response);

            if (!$outputText) {
                return ['success' => false, 'error' => 'No response from AI'];
            }

            if ($jsonExpected) {
                $outputText = '{' . $outputText;
            }

            return [
                'success' => true,
                'content' => $outputText,
                'model'   => $response->model,
                'usage'   => [
                    'input_tokens'  => $response->usage->inputTokens,
                    'output_tokens' => $response->usage->outputTokens,
                    'cache_creation_input_tokens' => $response->usage->cacheCreationInputTokens ?? 0,
                    'cache_read_input_tokens'     => $response->usage->cacheReadInputTokens ?? 0,
                ],
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    public function callMultiTurn(string $model, array $chatMessages, ?\Closure $toolHandler = null, array $tools = [], ?string $previousResponseId = null): array
    {
        [$systemBlocks, $messages] = $this->splitMessages($chatMessages);
        $system = !empty($systemBlocks) ? $this->buildCacheableSystem($systemBlocks) : null;
        $anthropicTools = ($toolHandler !== null && !empty($tools)) ? $this->formatTools($tools) : null;

        try {
            $textParts = [];

            for ($round = 0; $round <= self::MAX_TOOL_ROUNDS; $round++) {
                $response = $this->client->messages->create(
                    maxTokens: 4096,
                    messages: $messages,
                    model: $model,
                    system: $system,
                    tools: $anthropicTools,
                );

                $text = $this->extractText($response);
                if ($text !== null && trim($text) !== '') {
                    $textParts[] = $text;
                }

                if ($response->stopReason !== 'tool_use' || $toolHandler === null) {
                    break;
                }

                $messages = $this->appendToolRound($messages, $response->content, $toolHandler);
            }

            $outputText = trim(implode("\n\n", $textParts));
            if ($outputText === '') {
                return ['success' => false, 'error' => 'No response from AI'];
            }

            return ['success' => true, 'content' => $outputText, 'response_id' => null];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    public function stream(string $model, array $chatMessages, ?\Closure $toolHandler, array $tools, ?string $previousResponseId, callable $onDelta): array
    {
        [$systemBlocks, $messages] = $this->splitMessages($chatMessages);
        $system = !empty($systemBlocks) ? $this->buildCacheableSystem($systemBlocks) : null;
        $anthropicTools = ($toolHandler !== null && !empty($tools)) ? $this->formatTools($tools) : null;

        $anyTextStreamed = false;

        try {
            for ($round = 0; $round <= self::MAX_TOOL_ROUNDS; $round++) {
                $stream = $this->client->messages->createStream(
                    maxTokens: 4096,
                    messages: $messages,
                    model: $model,
                    system: $system,
                    tools: $anthropicTools,
                );

                $stopReason = null;
                $roundText  = '';
                $toolUses   = []; // content index => ['id' => string, 'name' => string, 'json' => string]

                foreach ($stream as $event) {
                    if ($event instanceof RawContentBlockStartEvent && $event->contentBlock instanceof ToolUseBlock) {
                        $toolUses[$event->index] = [
                            'id'   => $event->contentBlock->id,
                            'name' => $event->contentBlock->name,
                            'json' => '',
                        ];
                    } elseif ($event instanceof RawContentBlockDeltaEvent) {
                        if ($event->delta instanceof TextDelta) {
                            $text = $event->delta->text;
                            if ($text !== '') {
                                $onDelta($text);
                                $roundText .= $text;
                                $anyTextStreamed = true;
                            }
                        } elseif ($event->delta instanceof InputJSONDelta && isset($toolUses[$event->index])) {
                            $toolUses[$event->index]['json'] .= $event->delta->partialJSON;
                        }
                    } elseif ($event instanceof RawMessageDeltaEvent) {
                        $stopReason = $event->delta->stopReason;
                    }
                }

                if ($stopReason !== 'tool_use' || empty($toolUses) || $toolHandler === null) {
                    return ['success' => true, 'response_id' => null];
                }

                // Visual gap if the model already spoke before calling the tool.
                if (trim($roundText) !== '') {
                    $onDelta("\n\n");
                }

                $messages = $this->appendStreamedToolRound($messages, $roundText, $toolUses, $toolHandler);
            }

            // Tool-round cap reached: end gracefully with the text streamed so far.
            return ['success' => true, 'response_id' => null];
        } catch (\Throwable $e) {
            if ($anyTextStreamed) {
                // Don't surface an error to the client mid-message; keep what was streamed.
                return ['success' => true, 'response_id' => null];
            }
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────

    /**
     * Convert Chat-Completions style tool definitions
     * (['type' => 'function', 'function' => ['name', 'description', 'parameters']])
     * into Anthropic SDK Tool params.
     *
     * @return list<Tool>
     */
    private function formatTools(array $tools): array
    {
        $formatted = [];
        foreach ($tools as $tool) {
            $fn = $tool['function'] ?? null;
            if (!is_array($fn) || empty($fn['name'])) {
                continue;
            }
            $formatted[] = Tool::with(
                inputSchema: $fn['parameters'] ?? ['type' => 'object', 'properties' => new \stdClass()],
                name: $fn['name'],
                description: $fn['description'] ?? null,
            );
        }
        return $formatted;
    }

    /**
     * Execute the tool calls of a non-streamed response and append the
     * assistant turn + tool results to the conversation.
     *
     * @param list<MessageParam> $messages
     * @param iterable<object> $contentBlocks
     * @return list<MessageParam>
     */
    private function appendToolRound(array $messages, iterable $contentBlocks, \Closure $toolHandler): array
    {
        $assistantBlocks = [];
        $resultBlocks    = [];

        foreach ($contentBlocks as $block) {
            if ($block instanceof TextBlock) {
                if (trim($block->text) !== '') {
                    $assistantBlocks[] = TextBlockParam::with(text: $block->text);
                }
            } elseif ($block instanceof ToolUseBlock) {
                $input = (array) $block->input;
                $assistantBlocks[] = ToolUseBlockParam::with(id: $block->id, input: $input, name: $block->name);
                $resultBlocks[]    = $this->runTool($toolHandler, $block->id, $block->name, $input);
            }
        }

        $messages[] = MessageParam::with(content: $assistantBlocks, role: 'assistant');
        $messages[] = MessageParam::with(content: $resultBlocks, role: 'user');

        return $messages;
    }

    /**
     * Same as appendToolRound() but from accumulated streaming state.
     *
     * @param list<MessageParam> $messages
     * @param array<int, array{id: string, name: string, json: string}> $toolUses
     * @return list<MessageParam>
     */
    private function appendStreamedToolRound(array $messages, string $roundText, array $toolUses, \Closure $toolHandler): array
    {
        $assistantBlocks = [];
        $resultBlocks    = [];

        if (trim($roundText) !== '') {
            $assistantBlocks[] = TextBlockParam::with(text: $roundText);
        }

        ksort($toolUses);
        foreach ($toolUses as $tu) {
            $input = json_decode($tu['json'] !== '' ? $tu['json'] : '{}', true);
            $input = is_array($input) ? $input : [];
            $assistantBlocks[] = ToolUseBlockParam::with(id: $tu['id'], input: $input, name: $tu['name']);
            $resultBlocks[]    = $this->runTool($toolHandler, $tu['id'], $tu['name'], $input);
        }

        $messages[] = MessageParam::with(content: $assistantBlocks, role: 'assistant');
        $messages[] = MessageParam::with(content: $resultBlocks, role: 'user');

        return $messages;
    }

    /**
     * Run a single tool through the handler, never letting an exception
     * escape (the model gets the error as a tool result instead).
     */
    private function runTool(\Closure $toolHandler, string $toolUseId, string $name, array $input): ToolResultBlockParam
    {
        try {
            $result = $toolHandler($name, $input);
            return ToolResultBlockParam::with(
                toolUseID: $toolUseId,
                content: json_encode($result, JSON_UNESCAPED_UNICODE),
            );
        } catch (\Throwable $e) {
            return ToolResultBlockParam::with(
                toolUseID: $toolUseId,
                content: json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE),
                isError: true,
            );
        }
    }

    /**
     * Build system blocks with selective prompt caching using SDK types.
     *
     * @return list<TextBlockParam>
     */
    private function buildCacheableSystem(array $systemBlocks): array
    {
        return array_map(function (array $block) {
            return TextBlockParam::with(
                text: $block['text'],
                cacheControl: ($block['cache'] ?? false) ? CacheControlEphemeral::with() : null,
            );
        }, $systemBlocks);
    }

    /**
     * Extract the concatenated text from a Message response.
     */
    private function extractText(object $message): ?string
    {
        $parts = [];
        foreach ($message->content as $block) {
            if ($block instanceof TextBlock) {
                $parts[] = $block->text;
            }
        }
        return $parts !== [] ? implode('', $parts) : null;
    }

    /**
     * Split developer/system messages into structured system blocks + conversation messages.
     *
     * @return array{0: array<array{text: string, cache: bool}>, 1: list<MessageParam>}
     */
    private function splitMessages(array $chatMessages): array
    {
        $systemBlocks = [];
        $messages     = [];

        foreach ($chatMessages as $msg) {
            if (in_array($msg['role'], ['developer', 'system'], true)) {
                $systemBlocks[] = [
                    'text'  => $msg['content'],
                    'cache' => $msg['cache'] ?? false,
                ];
            } else {
                $messages[] = MessageParam::with(
                    content: $msg['content'],
                    role: $msg['role'],
                );
            }
        }

        return [$systemBlocks, $messages];
    }
}
