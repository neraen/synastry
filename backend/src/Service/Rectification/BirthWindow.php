<?php

namespace App\Service\Rectification;

/**
 * The interval of birth times being searched, and the grid of candidates on it.
 *
 * The window is expressed in *local civil time* because that is what the user
 * answers about ("le matin tôt", "autour de minuit"), and converted to UTC once,
 * here, using a declared offset. Nothing downstream ever sees a local time
 * again — which is the point: the historical-daylight-saving bug the spec warns
 * about can only enter through this one method.
 *
 * A window may legitimately straddle two civil dates (spec §4: a birth "autour
 * de minuit" when the date itself is uncertain), so the bounds are full
 * datetimes rather than times of day.
 */
final class BirthWindow
{
    public function __construct(
        public readonly \DateTimeImmutable $startLocal,
        public readonly \DateTimeImmutable $endLocal,
        public readonly float $utcOffset,
        public readonly float $latitude,
        public readonly float $longitude,
    ) {
        if ($endLocal <= $startLocal) {
            throw new \InvalidArgumentException('Fenêtre de naissance vide ou inversée.');
        }
    }

    /**
     * The "aucune idée partout" case: a full 24 h window, which the spec
     * explicitly keeps valid rather than treating as a dead end.
     */
    public static function fullDay(
        string $birthDate,
        float $utcOffset,
        float $latitude,
        float $longitude,
    ): self {
        $start = new \DateTimeImmutable($birthDate . ' 00:00:00', new \DateTimeZone('UTC'));

        return new self($start, $start->modify('+24 hours'), $utcOffset, $latitude, $longitude);
    }

    /**
     * A window given as local hours from the wizard's chip answers. `toHour`
     * below `fromHour` means the window wraps past midnight onto the next civil
     * date.
     */
    public static function fromLocalHours(
        string $birthDate,
        float $fromHour,
        float $toHour,
        float $utcOffset,
        float $latitude,
        float $longitude,
    ): self {
        $midnight = new \DateTimeImmutable($birthDate . ' 00:00:00', new \DateTimeZone('UTC'));

        $start = $midnight->modify(sprintf('%+d minutes', (int) round($fromHour * 60)));
        $end   = $midnight->modify(sprintf('%+d minutes', (int) round($toHour * 60)));

        if ($end <= $start) {
            $end = $end->modify('+24 hours');
        }

        return new self($start, $end, $utcOffset, $latitude, $longitude);
    }

    /**
     * Candidate birth times, every GRID_STEP_MINUTES.
     *
     * @return list<Candidate>
     */
    public function candidates(): array
    {
        $step       = RectificationConfig::GRID_STEP_MINUTES;
        $candidates = [];
        $index      = 0;

        for ($minute = 0; $minute < $this->durationMinutes(); $minute += $step) {
            $local = $this->startLocal->modify(sprintf('+%d minutes', $minute));
            $candidates[] = new Candidate($index++, $local, $this->toUtc($local));
        }

        return $candidates;
    }

    public function durationMinutes(): int
    {
        return (int) round(($this->endLocal->getTimestamp() - $this->startLocal->getTimestamp()) / 60);
    }

    /**
     * Local civil time to UTC, using the declared offset verbatim.
     *
     * Deliberately not `DateTimeZone`-driven: for a birth in, say, France in
     * 1976, the offset that applied is a historical fact that belongs to the
     * profile, not something to re-derive from a timezone database at
     * calculation time.
     */
    public function toUtc(\DateTimeImmutable $local): \DateTimeImmutable
    {
        return $local->modify(sprintf('%+d minutes', -(int) round($this->utcOffset * 60)));
    }
}
