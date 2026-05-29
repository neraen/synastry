<?php

namespace App\Service\Webservice;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

/**
 * OpenAI Responses API provider (/v1/responses).
 * Handles one-shot, multi-turn (with tool support + previous_response_id chaining), and streaming.
 */
class OpenAiProvider implements AiProviderInterface
{
    private HttpClientInterface $client;
    private string $apiUrl;
    private string $apiKey;

    public function __construct(HttpClientInterface $client, string $apiUrl, string $apiKey)
    {
        $this->client = $client;
        $this->apiUrl = $apiUrl;
        $this->apiKey = $apiKey;
    }

    public function call(string $model, string $input, ?string $instructions = null): array
    {
        $payload = ['model' => $model, 'input' => $input];

        if ($instructions) {
            $payload['instructions'] = $instructions;
        }

        try {
            $response = $this->client->request('POST', $this->apiUrl . '/responses', [
                'headers' => $this->headers(),
                'json'    => $payload,
                'timeout' => 180,
            ]);

            $data = $response->toArray();

            $outputText = $this->extractOutputText($data);

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
        [$instructions, $inputMessages] = $this->splitMessages($chatMessages);
        $formattedTools = $this->formatTools($tools);

        $payload = ['model' => $model];
        if ($instructions !== '') {
            $payload['instructions'] = $instructions;
        }
        if (!empty($formattedTools)) {
            $payload['tools'] = $formattedTools;
        }

        if ($previousResponseId !== null) {
            $payload['previous_response_id'] = $previousResponseId;
            $lastUser = null;
            foreach (array_reverse($inputMessages) as $msg) {
                if ($msg['role'] === 'user') { $lastUser = $msg; break; }
            }
            $payload['input'] = $lastUser ? [$lastUser] : $inputMessages;
        } else {
            $payload['input'] = $inputMessages;
        }

        $headers = $this->headers();

        try {
            $response = $this->client->request('POST', $this->apiUrl . '/responses', [
                'headers' => $headers,
                'json'    => $payload,
                'timeout' => 180,
            ]);

            $data       = $response->toArray();
            $responseId = $data['id'] ?? null;
            $outputText = null;
            $toolCalls  = [];

            foreach ($data['output'] ?? [] as $item) {
                if (($item['type'] ?? '') === 'function_call') {
                    $toolCalls[] = $item;
                } elseif (($item['type'] ?? '') === 'message') {
                    foreach ($item['content'] ?? [] as $content) {
                        if (($content['type'] ?? '') === 'output_text') {
                            $outputText = $content['text'];
                        }
                    }
                }
            }

            // Handle tool calls — chain via previous_response_id
            if (!empty($toolCalls) && $toolHandler !== null) {
                $toolResultItems = $this->executeToolCalls($toolCalls, $toolHandler);

                $payload2 = [
                    'model'                => $model,
                    'previous_response_id' => $responseId,
                    'input'                => $toolResultItems,
                ];
                if ($instructions !== '') {
                    $payload2['instructions'] = $instructions;
                }
                if (!empty($formattedTools)) {
                    $payload2['tools'] = $formattedTools;
                }

                $response2  = $this->client->request('POST', $this->apiUrl . '/responses', [
                    'headers' => $headers,
                    'json'    => $payload2,
                    'timeout' => 180,
                ]);
                $data2      = $response2->toArray();
                $responseId = $data2['id'] ?? $responseId;

                foreach ($data2['output'] ?? [] as $item) {
                    if (($item['type'] ?? '') === 'message') {
                        foreach ($item['content'] ?? [] as $content) {
                            if (($content['type'] ?? '') === 'output_text') {
                                $outputText = $content['text'];
                            }
                        }
                    }
                }
            }

            if (!$outputText) {
                return ['success' => false, 'error' => 'No response from AI', 'raw' => $data];
            }

            return ['success' => true, 'content' => $outputText, 'response_id' => $responseId];
        } catch (ExceptionInterface $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    public function stream(string $model, array $chatMessages, ?\Closure $toolHandler, array $tools, ?string $previousResponseId, callable $onDelta): array
    {
        [$instructions, $inputMessages] = $this->splitMessages($chatMessages);
        $formattedTools = $this->formatTools($tools);

        $payload = ['model' => $model, 'stream' => true];
        if ($instructions !== '') {
            $payload['instructions'] = $instructions;
        }
        if (!empty($formattedTools)) {
            $payload['tools'] = $formattedTools;
        }
        if ($previousResponseId !== null) {
            $payload['previous_response_id'] = $previousResponseId;
            $lastUser = null;
            foreach (array_reverse($inputMessages) as $msg) {
                if ($msg['role'] === 'user') { $lastUser = $msg; break; }
            }
            $payload['input'] = $lastUser ? [$lastUser] : $inputMessages;
        } else {
            $payload['input'] = $inputMessages;
        }

        $headers = $this->headers();

        try {
            [$responseId, $toolCalls] = $this->doStreamRequest($payload, $headers, $onDelta);

            // If tool calls, execute them then stream the follow-up
            if (!empty($toolCalls) && $toolHandler !== null) {
                $toolResultItems = $this->executeToolCalls($toolCalls, $toolHandler);

                $payload2 = [
                    'model'                => $model,
                    'stream'               => true,
                    'previous_response_id' => $responseId,
                    'input'                => $toolResultItems,
                ];
                if ($instructions !== '') $payload2['instructions'] = $instructions;
                if (!empty($formattedTools)) $payload2['tools'] = $formattedTools;

                [$responseId] = $this->doStreamRequest($payload2, $headers, $onDelta);
            }

            return ['success' => true, 'response_id' => $responseId];
        } catch (ExceptionInterface $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────

    private function headers(): array
    {
        return [
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ];
    }

    private function extractOutputText(array $data): ?string
    {
        foreach ($data['output'] ?? [] as $item) {
            if (($item['type'] ?? '') === 'message') {
                foreach ($item['content'] ?? [] as $content) {
                    if (($content['type'] ?? '') === 'output_text') {
                        return $content['text'];
                    }
                }
            }
        }
        return null;
    }

    /**
     * Split developer/system messages (→ instructions) from conversation messages (→ input).
     * @return array{0: string, 1: array}
     */
    private function splitMessages(array $chatMessages): array
    {
        $instructions = '';
        $inputMessages = [];

        foreach ($chatMessages as $msg) {
            if (in_array($msg['role'], ['developer', 'system'], true)) {
                $instructions .= ($instructions !== '' ? "\n\n" : '') . $msg['content'];
            } else {
                $inputMessages[] = ['role' => $msg['role'], 'content' => $msg['content']];
            }
        }

        return [$instructions, $inputMessages];
    }

    /**
     * Convert Chat Completions tool format to Responses API format.
     */
    private function formatTools(array $tools): array
    {
        if (empty($tools)) return [];

        return array_map(function (array $tool): array {
            if (isset($tool['function'])) {
                return [
                    'type'        => 'function',
                    'name'        => $tool['function']['name'],
                    'description' => $tool['function']['description'] ?? '',
                    'parameters'  => $tool['function']['parameters'] ?? new \stdClass(),
                ];
            }
            return $tool;
        }, $tools);
    }

    /**
     * Execute tool calls and return function_call_output items.
     */
    private function executeToolCalls(array $toolCalls, \Closure $toolHandler): array
    {
        $items = [];
        foreach ($toolCalls as $toolCall) {
            $arguments  = json_decode($toolCall['arguments'], true) ?? [];
            $toolResult = $toolHandler($toolCall['name'], $arguments);
            $items[] = [
                'type'    => 'function_call_output',
                'call_id' => $toolCall['call_id'],
                'output'  => is_string($toolResult) ? $toolResult : json_encode($toolResult, JSON_UNESCAPED_UNICODE),
            ];
        }
        return $items;
    }

    /**
     * Execute one streaming API call, invoking $onDelta for each text token.
     * @return array{0: string|null, 1: array} [responseId, toolCalls]
     */
    private function doStreamRequest(array $payload, array $headers, callable $onDelta): array
    {
        $response = $this->client->request('POST', $this->apiUrl . '/responses', [
            'headers' => $headers,
            'json'    => $payload,
            'timeout' => 180,
            'buffer'  => false,
        ]);

        $buffer        = '';
        $responseId    = null;
        $toolCalls     = [];
        $toolCallAccum = [];

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

                $type = $event['type'] ?? '';

                if ($type === 'response.output_text.delta') {
                    $delta = $event['delta'] ?? '';
                    if ($delta !== '') {
                        $onDelta($delta);
                    }
                } elseif ($type === 'response.function_call_arguments.delta') {
                    $itemId = $event['item_id'] ?? '';
                    if ($itemId) {
                        $toolCallAccum[$itemId]['args'] = ($toolCallAccum[$itemId]['args'] ?? '') . ($event['delta'] ?? '');
                    }
                } elseif ($type === 'response.output_item.done') {
                    $item = $event['item'] ?? [];
                    if (($item['type'] ?? '') === 'function_call') {
                        $toolCalls[] = [
                            'name'      => $item['name'] ?? '',
                            'call_id'   => $item['call_id'] ?? '',
                            'arguments' => $item['arguments'] ?? ($toolCallAccum[$item['id'] ?? '']['args'] ?? '{}'),
                        ];
                    }
                } elseif ($type === 'response.completed') {
                    $responseId = $event['response']['id'] ?? null;
                }
            }
        }

        return [$responseId, $toolCalls];
    }
}
