<?php

namespace App\Service\Rectification\Technique;

use App\Service\Rectification\NatalContext;

/**
 * A dating technique: how strongly a given candidate birth chart "predicts"
 * that something happened on a given date.
 *
 * Implementations return a *raw* score. They must not attempt to normalise or
 * weight it — the engine divides by the technique's base rate (how much it
 * scores at random dates for the same chart) and applies the configured weight.
 * Keeping that out of the techniques is what makes a rare, slow technique and a
 * frequent, fast one comparable at all.
 */
interface TechniqueInterface
{
    /** Key into {@see \App\Service\Rectification\RectificationConfig::TECHNIQUES}. */
    public function name(): string;

    /**
     * Raw, unnormalised score for this candidate at this date. Zero means the
     * technique says nothing; larger means a tighter or more numerous hit.
     */
    public function score(NatalContext $natal, \DateTimeImmutable $date): float;

    /**
     * The individual hits behind the score, for the "pourquoi cette heure"
     * explanations of spec §9.2.
     *
     * @return list<array{moving: string, target: string, aspect: string, orb: float, score: float}>
     */
    public function hits(NatalContext $natal, \DateTimeImmutable $date): array;
}
