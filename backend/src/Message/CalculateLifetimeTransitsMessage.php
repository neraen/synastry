<?php

namespace App\Message;

/**
 * Dispatched after user registration to pre-calculate and cache
 * transit planetary positions for ages 0–80.
 */
final class CalculateLifetimeTransitsMessage
{
    public function __construct(
        public readonly int $userId,
    ) {}
}