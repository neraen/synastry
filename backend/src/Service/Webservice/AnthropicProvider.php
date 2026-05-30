<?php

namespace App\Service\Webservice;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

/**
 * Anthropic Messages API provider (/v1/messages).
 * Handles one-shot, multi-turn, and streaming for Claude models.
 */
class AnthropicProvider implements AiProviderInterface
{
    private const API_URL = 'https://api.anthropic.com/v1/messages';

    private HttpClientInterface $client;
    private string $apiKey;

    public function __construct(HttpClientInterface $client, string $apiKey)
    {
        $this->client = $client;
        $this->apiKey = $apiKey;
    }

    public function call(string $model, string $input, ?string $instructions = null, ?int $maxTokens = null): array
    {
        // Detect if JSON output is expected from the instructions
        $jsonExpected = $instructions && (
            stripos($instructions, 'JSON') !== false
            || stripos($instructions, 'json') !== false
        );

        $messages = [['role' => 'user', 'content' => $input]];

        // Prefill technique: force Claude to start outputting JSON directly
        // by adding an assistant message that begins with "{"
        if ($jsonExpected) {
            $messages[] = ['role' => 'assistant', 'content' => '{'];
        }

        $payload = [
            'model'      => $model,
            'max_tokens' => $maxTokens ?? 8192,
            'messages'   => $messages,
        ];

        if ($instructions) {
            $payload['system'] = $instructions;
        }

        try {
            $response = $this->client->request('POST', self::API_URL, [
                'headers' => $this->headers(),
                'json'    => $payload,
                'timeout' => 180,
            ]);

            $statusCode = $response->getStatusCode();
            $data       = $response->toArray(false);

            if ($statusCode !== 200) {
                $errorMsg = $data['error']['message'] ?? "HTTP {$statusCode}";
                return ['success' => false, 'error' => "Anthropic error ({$statusCode}): {$errorMsg}"];
            }

            $outputText = $this->extractText($data);

            if (!$outputText) {
                return ['success' => false, 'error' => 'No response from AI', 'raw' => $data];
            }

            // Prepend the "{" we used as prefill since Claude continues from there
            if ($jsonExpected) {
                $outputText = '{' . $outputText;
            }

            return [
                'success' => true,
                'content' => $outputText,
                'model'   => $data['model'] ?? $model,
                'usage'   => $data['usage'] ?? null,
            ];
        } catch (ExceptionInterface $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    public function callMultiTurn(string $model, array $chatMessages, ?\Closure $toolHandler = null, array $tools = [], ?string $previousResponseId = null): array
    {
        [$systemBlocks, $messages] = $this->splitMessages($chatMessages);

        $payload = [
            'model'      => $model,
            'max_tokens' => 4096,
            'messages'   => $messages,
        ];

        if (!empty($systemBlocks)) {
            $payload['system'] = $this->buildCacheableSystem($systemBlocks);
        }

        try {
            $response = $this->client->request('POST', self::API_URL, [
                'headers' => $this->headers(),
                'json'    => $payload,
                'timeout' => 180,
            ]);

            $statusCode = $response->getStatusCode();
            $data       = $response->toArray(false);

            if ($statusCode !== 200) {
                $errorMsg = $data['error']['message'] ?? "HTTP {$statusCode}";
                return ['success' => false, 'error' => "Anthropic error ({$statusCode}): {$errorMsg}"];
            }

            $outputText = $this->extractText($data);

            if (!$outputText) {
                return ['success' => false, 'error' => 'No response from AI', 'raw' => $data];
            }

            return ['success' => true, 'content' => $outputText, 'response_id' => null];
        } catch (ExceptionInterface $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    public function stream(string $model, array $chatMessages, ?\Closure $toolHandler, array $tools, ?string $previousResponseId, callable $onDelta): array
    {
        [$systemBlocks, $messages] = $this->splitMessages($chatMessages);

        $payload = [
            'model'      => $model,
            'max_tokens' => 4096,
            'stream'     => true,
            'messages'   => $messages,
        ];

        if (!empty($systemBlocks)) {
            $payload['system'] = $this->buildCacheableSystem($systemBlocks);
        }

        try {
            $response = $this->client->request('POST', self::API_URL, [
                'headers' => $this->headers(),
                'json'    => $payload,
                'timeout' => 180,
                'buffer'  => false,
            ]);

            $buffer = '';

            foreach ($this->client->stream($response) as $chunk) {
                $buffer .= $chunk->getContent();

                while (($pos = strpos($buffer, "\n\n")) !== false) {
                    $rawEvent = substr($buffer, 0, $pos);
                    $buffer   = substr($buffer, $pos + 2);

                    $dataStr = '';
                    foreach (explode("\n", $rawEvent) as $line) {
                        if (str_starts_with($line, 'data: ')) {
                            $dataStr = substr($line, 6);
                        }
                    }

                    if ($dataStr === '' || $dataStr === '[DONE]') continue;

                    $event = json_decode($dataStr, true);
                    if (!is_array($event)) continue;

                    if (($event['type'] ?? '') === 'content_block_delta') {
                        $delta = $event['delta']['text'] ?? '';
                        if ($delta !== '') {
                            $onDelta($delta);
                        }
                    }
                }
            }

            return ['success' => true, 'response_id' => null];
        } catch (ExceptionInterface $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────

    private function headers(): array
    {
        return [
            'x-api-key'         => $this->apiKey,
            'anthropic-version'  => '2023-06-01',
            'anthropic-beta'     => 'prompt-caching-2024-07-31',
            'Content-Type'       => 'application/json',
        ];
    }

    /**
     * Convert system blocks into Anthropic structured content with selective caching.
     *
     * Each block with 'cache' => true gets a cache_control breakpoint.
     * Anthropic caches from the beginning up to each breakpoint for ~5 min,
     * saving input tokens on follow-up messages in the same chat session.
     *
     * Typical layout:
     *   Block 1 (cached): static instructions (~2500 tokens) — shared across ALL users
     *   Block 2 (cached): user natal positions (~200 tokens) — stable within a session
     *   Block 3 (not cached): today's date + transits — changes daily
     *
     * @see https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
     */
    private function buildCacheableSystem(array $systemBlocks): array
    {
        return array_map(function (array $block) {
            $item = ['type' => 'text', 'text' => $block['text']];
            if ($block['cache'] ?? false) {
                $item['cache_control'] = ['type' => 'ephemeral'];
            }
            return $item;
        }, $systemBlocks);
    }

    private function extractText(array $data): ?string
    {
        foreach ($data['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                return $block['text'];
            }
        }
        return null;
    }

    /**
     * Split developer/system messages into structured system blocks, rest into messages array.
     * Preserves the 'cache' hint from each developer message for selective prompt caching.
     *
     * @return array{0: array<array{text: string, cache: bool}>, 1: array}
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
                $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
            }
        }

        return [$systemBlocks, $messages];
    }
}
