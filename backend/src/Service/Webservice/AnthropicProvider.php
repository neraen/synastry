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

    public function call(string $model, string $input, ?string $instructions = null): array
    {
        $payload = [
            'model'      => $model,
            'max_tokens' => 4096,
            'messages'   => [['role' => 'user', 'content' => $input]],
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
        [$system, $messages] = $this->splitMessages($chatMessages);

        $payload = [
            'model'      => $model,
            'max_tokens' => 4096,
            'messages'   => $messages,
        ];

        if ($system !== '') {
            $payload['system'] = $system;
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
        [$system, $messages] = $this->splitMessages($chatMessages);

        $payload = [
            'model'      => $model,
            'max_tokens' => 4096,
            'stream'     => true,
            'messages'   => $messages,
        ];

        if ($system !== '') {
            $payload['system'] = $system;
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
            'x-api-key'        => $this->apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type'      => 'application/json',
        ];
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
     * Split developer/system messages into system prompt, rest into messages array.
     * @return array{0: string, 1: array}
     */
    private function splitMessages(array $chatMessages): array
    {
        $system   = '';
        $messages = [];

        foreach ($chatMessages as $msg) {
            if (in_array($msg['role'], ['developer', 'system'], true)) {
                $system .= ($system !== '' ? "\n\n" : '') . $msg['content'];
            } else {
                $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
            }
        }

        return [$system, $messages];
    }
}
