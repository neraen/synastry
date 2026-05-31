<?php

namespace App\Service\Webservice;

/**
 * Anthropic Messages API provider using raw HTTP (cURL).
 * Handles one-shot, multi-turn, and streaming for Claude models.
 * Supports prompt caching via cache_control breakpoints.
 */
class AnthropicProvider implements AiProviderInterface
{
    private string $apiKey;
    private const API_URL = 'https://api.anthropic.com/v1/messages';

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
    }

    public function call(string $model, string $input, ?string $instructions = null, ?int $maxTokens = null): array
    {
        $jsonExpected = $instructions && (
            stripos($instructions, 'JSON') !== false
            || stripos($instructions, 'json') !== false
        );

        $messages = [['role' => 'user', 'content' => $input]];

        // Prefill technique: force Claude to start outputting JSON
        if ($jsonExpected) {
            $messages[] = ['role' => 'assistant', 'content' => '{'];
        }

        $body = [
            'model' => $model,
            'max_tokens' => $maxTokens ?? 8192,
            'messages' => $messages,
        ];

        if ($instructions) {
            $body['system'] = $instructions;
        }

        try {
            $response = $this->request($body);

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
                'model'   => $response['model'] ?? $model,
                'usage'   => [
                    'input_tokens'  => $response['usage']['input_tokens'] ?? 0,
                    'output_tokens' => $response['usage']['output_tokens'] ?? 0,
                    'cache_creation_input_tokens' => $response['usage']['cache_creation_input_tokens'] ?? 0,
                    'cache_read_input_tokens'     => $response['usage']['cache_read_input_tokens'] ?? 0,
                ],
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    public function callMultiTurn(string $model, array $chatMessages, ?\Closure $toolHandler = null, array $tools = [], ?string $previousResponseId = null): array
    {
        [$systemBlocks, $messages] = $this->splitMessages($chatMessages);

        $body = [
            'model' => $model,
            'max_tokens' => 4096,
            'messages' => $messages,
        ];

        if (!empty($systemBlocks)) {
            $body['system'] = $this->buildCacheableSystem($systemBlocks);
        }

        try {
            $response = $this->request($body);

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

        $body = [
            'model' => $model,
            'max_tokens' => 4096,
            'messages' => $messages,
            'stream' => true,
        ];

        if (!empty($systemBlocks)) {
            $body['system'] = $this->buildCacheableSystem($systemBlocks);
        }

        try {
            $this->requestStream($body, $onDelta);

            return ['success' => true, 'response_id' => null];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    // -- Private helpers -----------------------------------------------------

    /**
     * Build system blocks with prompt caching.
     * Blocks with 'cache' => true get a cache_control breakpoint.
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

    /**
     * Extract text from a Messages API response.
     */
    private function extractText(array $response): ?string
    {
        foreach ($response['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                return $block['text'] ?? null;
            }
        }
        return null;
    }

    /**
     * Split developer/system messages into system blocks + conversation messages.
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
                $messages[] = [
                    'role'    => $msg['role'],
                    'content' => $msg['content'],
                ];
            }
        }

        return [$systemBlocks, $messages];
    }

    /**
     * Make a synchronous request to the Anthropic Messages API.
     */
    private function request(array $body): array
    {
        $ch = curl_init(self::API_URL);

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $this->headers(),
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_TIMEOUT        => 120,
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($result === false) {
            throw new \RuntimeException('cURL error: ' . $error);
        }

        $decoded = json_decode($result, true);
        if ($httpCode >= 400) {
            $msg = $decoded['error']['message'] ?? "HTTP $httpCode";
            throw new \RuntimeException("Anthropic API error: $msg");
        }

        return $decoded;
    }

    /**
     * Make a streaming request to the Anthropic Messages API.
     */
    private function requestStream(array $body, callable $onDelta): void
    {
        $ch = curl_init(self::API_URL);

        $buffer = '';

        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_HTTPHEADER     => $this->headers(),
            CURLOPT_POSTFIELDS     => json_encode($body),
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_WRITEFUNCTION  => function ($ch, $data) use (&$buffer, $onDelta) {
                $buffer .= $data;

                while (($pos = strpos($buffer, "\n")) !== false) {
                    $line = substr($buffer, 0, $pos);
                    $buffer = substr($buffer, $pos + 1);
                    $line = trim($line);

                    if (str_starts_with($line, 'data: ')) {
                        $json = substr($line, 6);
                        if ($json === '[DONE]') {
                            continue;
                        }
                        $event = json_decode($json, true);
                        if ($event && ($event['type'] ?? '') === 'content_block_delta') {
                            $text = $event['delta']['text'] ?? '';
                            if ($text !== '') {
                                $onDelta($text);
                            }
                        }
                    }
                }

                return strlen($data);
            },
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($result === false && $error) {
            throw new \RuntimeException('cURL stream error: ' . $error);
        }

        if ($httpCode >= 400) {
            throw new \RuntimeException("Anthropic API stream error: HTTP $httpCode");
        }
    }

    /**
     * Common headers for Anthropic API requests.
     */
    private function headers(): array
    {
        return [
            'Content-Type: application/json',
            'x-api-key: ' . $this->apiKey,
            'anthropic-version: 2023-06-01',
            'anthropic-beta: prompt-caching-2024-07-31',
        ];
    }
}
