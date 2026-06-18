<?php

namespace App\Message;

/**
 * Trigger generation of the collective Actu astro feed (+ mood corpus) for a
 * month. Null year/month → current and next month (run by the monthly scheduler).
 */
final class GenerateActuAstroMessage
{
    public function __construct(
        public readonly ?int $year = null,
        public readonly ?int $month = null,
        /** @var string[] */
        public readonly array $locales = ['fr', 'en'],
    ) {
    }
}
