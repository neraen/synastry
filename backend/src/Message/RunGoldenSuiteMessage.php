<?php

namespace App\Message;

/**
 * Triggers an asynchronous execution of a golden evaluation run.
 */
final class RunGoldenSuiteMessage
{
    public function __construct(
        public readonly int $runId,
    ) {}
}
