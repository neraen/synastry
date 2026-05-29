<?php

namespace App\Service\Webservice;

/**
 * Abstraction for AI provider HTTP communication (OpenAI, Anthropic, etc.).
 *
 * Each implementation handles its own endpoint, auth headers, payload format,
 * response parsing, and SSE event structure.
 */
interface AiProviderInterface
{
    /**
     * Simple one-shot prompt → response.
     *
     * @return array{success: bool, content?: string, model?: string, usage?: array|null, error?: string}
     */
    public function call(string $model, string $input, ?string $instructions = null): array;

    /**
     * Multi-turn conversation with optional tool use.
     *
     * @param string                $model              AI model identifier
     * @param array                 $chatMessages       [{role: developer|system|user|assistant, content: string}, ...]
     * @param \Closure|null         $toolHandler        Callback($toolName, $arguments) → string|array
     * @param array                 $tools              Tool definitions (OpenAI function-calling format)
     * @param string|null           $previousResponseId Provider-specific conversation chaining ID
     *
     * @return array{success: bool, content?: string, response_id?: string|null, error?: string}
     */
    public function callMultiTurn(string $model, array $chatMessages, ?\Closure $toolHandler = null, array $tools = [], ?string $previousResponseId = null): array;

    /**
     * Streaming multi-turn conversation.
     *
     * @return array{success: bool, response_id?: string|null, error?: string}
     */
    public function stream(string $model, array $chatMessages, ?\Closure $toolHandler, array $tools, ?string $previousResponseId, callable $onDelta): array;
}
