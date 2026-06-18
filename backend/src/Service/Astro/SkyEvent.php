<?php

namespace App\Service\Astro;

use App\Service\PlanetaryCalculator;

/**
 * One dated astrological event, produced deterministically by {@see SkyEventDetector}.
 *
 * This is the source of truth: every date, sign and degree here comes from the
 * home ephemeris (Meeus, via PlanetaryCalculator), never from an LLM. The
 * collective prose layer (AstroEvent) only ever decorates these facts.
 */
final class SkyEvent
{
    // Event type taxonomy (kept as plain strings to stay trivially serialisable).
    public const TYPE_NEW_MOON        = 'lunation_new';
    public const TYPE_FULL_MOON       = 'lunation_full';
    public const TYPE_SOLAR_ECLIPSE   = 'eclipse_solar';
    public const TYPE_LUNAR_ECLIPSE   = 'eclipse_lunar';
    public const TYPE_RETROGRADE_START = 'retrograde_start';
    public const TYPE_RETROGRADE_END   = 'retrograde_end';
    public const TYPE_INGRESSION      = 'ingression';
    public const TYPE_ASPECT          = 'aspect';

    /**
     * @param string                  $type       One of the TYPE_* constants.
     * @param \DateTimeImmutable       $exactAt    Exact moment (UTC).
     * @param string|null             $planet     Primary body (English name), null for pure lunations handled via Moon.
     * @param string|null             $planet2    Secondary body for aspects.
     * @param string|null             $aspectType conjunction|sextile|square|trine|opposition, aspects only.
     * @param float|null              $longitude  Absolute ecliptic longitude of the primary body at exactAt.
     * @param float|null              $longitude2 Absolute ecliptic longitude of the secondary body.
     * @param array<string,mixed>     $metadata   isEclipse, solstice, equinox, retroTargetSign, ingressFrom…
     */
    public function __construct(
        public readonly string $type,
        public readonly \DateTimeImmutable $exactAt,
        public readonly ?string $planet = null,
        public readonly ?string $planet2 = null,
        public readonly ?string $aspectType = null,
        public readonly ?float $longitude = null,
        public readonly ?float $longitude2 = null,
        public readonly array $metadata = [],
    ) {
    }

    /** Zodiac index 0..11 of the primary body, or null when no longitude. */
    public function signIndex(): ?int
    {
        if ($this->longitude === null) {
            return null;
        }
        return (int) floor($this->normalise($this->longitude) / 30.0);
    }

    /** French sign name of the primary body. */
    public function signFr(): ?string
    {
        $i = $this->signIndex();
        return $i === null ? null : PlanetaryCalculator::SIGNS_FR[$i];
    }

    /** English sign name of the primary body. */
    public function sign(): ?string
    {
        $i = $this->signIndex();
        return $i === null ? null : PlanetaryCalculator::SIGNS[$i];
    }

    /** Whole degree within the sign (0..29) of the primary body. */
    public function degreeInSign(): ?int
    {
        if ($this->longitude === null) {
            return null;
        }
        return (int) floor(fmod($this->normalise($this->longitude), 30.0));
    }

    public function signFr2(): ?string
    {
        if ($this->longitude2 === null) {
            return null;
        }
        return PlanetaryCalculator::SIGNS_FR[(int) floor($this->normalise($this->longitude2) / 30.0)];
    }

    public function degreeInSign2(): ?int
    {
        if ($this->longitude2 === null) {
            return null;
        }
        return (int) floor(fmod($this->normalise($this->longitude2), 30.0));
    }

    public function isEclipse(): bool
    {
        return $this->type === self::TYPE_SOLAR_ECLIPSE || $this->type === self::TYPE_LUNAR_ECLIPSE;
    }

    /**
     * Stable identity across regenerations: same astronomical event → same key.
     * Rounded to the hour so tiny algorithmic jitter never duplicates a row.
     */
    public function fingerprint(): string
    {
        $parts = [
            $this->type,
            $this->planet ?? '',
            $this->planet2 ?? '',
            $this->aspectType ?? '',
            $this->exactAt->format('Y-m-d H'),
        ];
        return md5(implode('|', $parts));
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'type'        => $this->type,
            'exactAt'     => $this->exactAt->format(\DateTimeInterface::ATOM),
            'planet'      => $this->planet,
            'planet2'     => $this->planet2,
            'aspectType'  => $this->aspectType,
            'longitude'   => $this->longitude,
            'longitude2'  => $this->longitude2,
            'sign'        => $this->sign(),
            'signFr'      => $this->signFr(),
            'degree'      => $this->degreeInSign(),
            'signFr2'     => $this->signFr2(),
            'degree2'     => $this->degreeInSign2(),
            'metadata'    => $this->metadata,
            'fingerprint' => $this->fingerprint(),
        ];
    }

    private function normalise(float $deg): float
    {
        return fmod(fmod($deg, 360.0) + 360.0, 360.0);
    }
}
