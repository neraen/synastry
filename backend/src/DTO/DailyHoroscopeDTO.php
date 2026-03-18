<?php

namespace App\DTO;

class DailyHoroscopeDTO
{
    public string $title;
    public string $overview;
    public string $love;
    public string $energy;
    public string $advice;
    public string $date;
    public bool $cached;

    public function __construct(
        string $title,
        string $overview,
        string $love,
        string $energy,
        string $advice,
        string $date,
        bool $cached = false
    ) {
        $this->title = $title;
        $this->overview = $overview;
        $this->love = $love;
        $this->energy = $energy;
        $this->advice = $advice;
        $this->date = $date;
        $this->cached = $cached;
    }

    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'overview' => $this->overview,
            'love' => $this->love,
            'energy' => $this->energy,
            'advice' => $this->advice,
            'date' => $this->date,
            'cached' => $this->cached,
        ];
    }
}
