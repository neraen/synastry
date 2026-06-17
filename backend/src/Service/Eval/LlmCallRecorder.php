<?php

namespace App\Service\Eval;

use App\Entity\EvalRun;
use App\Entity\LlmCallLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Central recorder for LLM token usage + estimated cost.
 *
 * Orchestrators set a lightweight context (user + reference) before generating;
 * OpenAiService calls {@see record()} after each provider call. The recorder
 * only persist()s — it relies on the request's existing flush to avoid extra
 * writes in the hot generation path.
 *
 * Pricing is an estimate (USD per 1M tokens) maintained here; update as
 * provider prices change.
 */
class LlmCallRecorder
{
    /**
     * USD per 1,000,000 tokens. Keys matched by str_starts_with on the model id.
     * [input, output, cacheWrite, cacheRead]
     */
    private const PRICING = [
        // Anthropic
        'claude-haiku-4-5'  => [1.00, 5.00, 1.25, 0.10],
        'claude-sonnet-4'   => [3.00, 15.00, 3.75, 0.30],
        'claude-opus-4'     => [15.00, 75.00, 18.75, 1.50],
        'claude-3-5-haiku'  => [0.80, 4.00, 1.00, 0.08],
        // OpenAI
        'gpt-4.1-mini'      => [0.40, 1.60, 0.40, 0.10],
        'gpt-4.1-nano'      => [0.10, 0.40, 0.10, 0.025],
        'gpt-4.1'           => [2.00, 8.00, 2.00, 0.50],
        'gpt-4o-mini'       => [0.15, 0.60, 0.15, 0.075],
        'gpt-4o'            => [2.50, 10.00, 2.50, 1.25],
    ];

    /** Fallback pricing when the model is unknown. */
    private const PRICING_FALLBACK = [1.00, 5.00, 1.25, 0.10];

    private string $generationType = 'unknown';
    private ?string $referenceType = null;
    private ?string $referenceId = null;
    private ?User $user = null;
    private ?EvalRun $evalRun = null;

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /**
     * Tag subsequent LLM calls. Call {@see clearContext()} when done.
     */
    public function setContext(
        ?string $generationType = null,
        ?string $referenceType = null,
        ?string $referenceId = null,
        ?User $user = null,
    ): void {
        if ($generationType !== null) {
            $this->generationType = $generationType;
        }
        $this->referenceType = $referenceType;
        $this->referenceId   = $referenceId;
        $this->user          = $user;
    }

    /** Tag subsequent calls as part of a golden run (for cost roll-up). */
    public function setEvalRun(?EvalRun $run): void
    {
        $this->evalRun = $run;
    }

    public function clearContext(): void
    {
        $this->generationType = 'unknown';
        $this->referenceType  = null;
        $this->referenceId    = null;
        $this->user           = null;
        $this->evalRun        = null;
    }

    /**
     * Record one provider call. $result is the array returned by a provider
     * (expects optional 'usage', 'model', 'success'). $generationType overrides
     * the current context type when known at the call site.
     */
    public function record(
        string $provider,
        string $model,
        array $result,
        ?string $generationType = null,
        ?int $latencyMs = null,
    ): void {
        $usage = $this->normalizeUsage($result['usage'] ?? null);

        $log = new LlmCallLog(
            $provider,
            $result['model'] ?? $model,
            $generationType ?? $this->generationType,
        );
        $log->setReferenceType($this->referenceType)
            ->setReferenceId($this->referenceId)
            ->setUser($this->user)
            ->setEvalRun($this->evalRun)
            ->setInputTokens($usage['input'])
            ->setOutputTokens($usage['output'])
            ->setCacheCreationInputTokens($usage['cacheCreation'])
            ->setCacheReadInputTokens($usage['cacheRead'])
            ->setEstimatedCostUsd($this->estimateCost($model, $usage))
            ->setLatencyMs($latencyMs)
            ->setSuccess((bool) ($result['success'] ?? false));

        $this->em->persist($log);
    }

    /**
     * Public cost estimate for a usage payload (used by the eval engine to
     * record the judge cost on an EvalResult). Returns a decimal string USD.
     */
    public function estimate(string $model, mixed $usage): string
    {
        return $this->estimateCost($model, $this->normalizeUsage($usage));
    }

    /**
     * Normalize the two usage shapes (Anthropic snake_case / OpenAI Responses).
     *
     * @return array{input:int,output:int,cacheCreation:int,cacheRead:int}
     */
    private function normalizeUsage(mixed $usage): array
    {
        if (!is_array($usage)) {
            return ['input' => 0, 'output' => 0, 'cacheCreation' => 0, 'cacheRead' => 0];
        }

        // OpenAI Responses API uses input_tokens / output_tokens with a nested
        // input_tokens_details.cached_tokens; Anthropic uses explicit cache fields.
        $cachedDetails = (int) ($usage['input_tokens_details']['cached_tokens'] ?? 0);

        return [
            'input'         => (int) ($usage['input_tokens'] ?? $usage['prompt_tokens'] ?? 0),
            'output'        => (int) ($usage['output_tokens'] ?? $usage['completion_tokens'] ?? 0),
            'cacheCreation' => (int) ($usage['cache_creation_input_tokens'] ?? 0),
            'cacheRead'     => (int) ($usage['cache_read_input_tokens'] ?? $cachedDetails),
        ];
    }

    /**
     * @param array{input:int,output:int,cacheCreation:int,cacheRead:int} $usage
     */
    private function estimateCost(string $model, array $usage): string
    {
        [$inP, $outP, $cwP, $crP] = $this->pricingFor($model);

        // Non-cached input = input_tokens minus cache_read (Anthropic reports them
        // separately; for OpenAI cached_tokens are a subset of input_tokens).
        $plainInput = max(0, $usage['input'] - $usage['cacheRead']);

        $cost =
            $plainInput            / 1_000_000 * $inP +
            $usage['output']       / 1_000_000 * $outP +
            $usage['cacheCreation']/ 1_000_000 * $cwP +
            $usage['cacheRead']    / 1_000_000 * $crP;

        return number_format($cost, 6, '.', '');
    }

    /**
     * @return array{0:float,1:float,2:float,3:float}
     */
    private function pricingFor(string $model): array
    {
        foreach (self::PRICING as $prefix => $price) {
            if (str_starts_with($model, $prefix)) {
                return $price;
            }
        }
        return self::PRICING_FALLBACK;
    }
}
