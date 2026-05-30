<?php

namespace App\Service\Webservice;

use Anthropic\Client as AnthropicClient;
use Anthropic\Messages\CacheControlEphemeral;
use Anthropic\Messages\MessageParam;
use Anthropic\Messages\RawContentBlockDeltaEvent;
use Anthropic\Messages\TextBlock;
use Anthropic\Messages\TextBlockParam;
use Anthropic\Messages\TextDelta;

/**
 * Anthropic Messages API provider using the official SDK.
 * Handles one-shot, multi-turn, and streaming for Claude models.
 */
class AnthropicProvider implements AiProviderInterface
{
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

        try {
            $response = $this->client->messages->create(
                maxTokens: 4096,
                messages: $messages,
                model: $model,
                system: !empty($systemBlocks) ? $this->buildCacheableSystem($systemBlocks) : null,
            );

            $outputText = $this->extractText($response);

            if (!$outputText) {
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

        try {
            $stream = $this->client->messages->createStream(
                maxTokens: 4096,
                messages: $messages,
                model: $model,
                system: !empty($systemBlocks) ? $this->buildCacheableSystem($systemBlocks) : null,
            );

            foreach ($stream as $event) {
                if ($event instanceof RawContentBlockDeltaEvent && $event->delta instanceof TextDelta) {
                    $text = $event->delta->text;
                    if ($text !== '') {
                        $onDelta($text);
                    }
                }
            }

            return ['success' => true, 'response_id' => null];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────

    /**
     * Build system blocks with selective prompt caching using SDK types.
     *
     * Blocks with 'cache' => true get a CacheControlEphemeral breakpoint.
     * Anthropic caches from the start up to each breakpoint for ~5 min.
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
     * Extract text from a Message response.
     */
    private function extractText(object $message): ?string
    {
        foreach ($message->content as $block) {
            if ($block instanceof TextBlock) {
                return $block->text;
            }
        }
        return null;
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
