<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

class EphemerisDTO
{
    #[Assert\NotBlank(message: 'Years cannot be blank')]
    private int $year;

    #[Assert\NotBlank(message:'Month cannot be blank')]
    private int $month;

    #[Assert\NotBlank(message:'Day cannot be blank')]
    private int $day;

    #[Assert\NotBlank(message:'Hours cannot be blank')]
    private int $hours;

    #[Assert\NotBlank(message: 'Minutes cannot be blank')]
    private int $minutes;

    #[Assert\NotBlank(message: 'Seconds cannot be blank')]
    private int $seconds;
    #[Assert\NotBlank(message: 'Latitude cannot be blank')]
    private float $latitude;
    #[Assert\NotBlank(message: 'Longitude cannot be blank')]
    private float $longitude;

    #[Assert\NotBlank(message: 'Timezone cannot be blank')]
    private float $timezone;

    /**
     * @return int
     */
    public function getYear(): int
    {
        return $this->year;
    }

    /**
     * @param int $year
     */
    public function setYear(int $year): void
    {
        $this->year = $year;
    }

    /**
     * @return int
     */
    public function getMonth(): int
    {
        return $this->month;
    }

    /**
     * @param int $month
     */
    public function setMonth(int $month): void
    {
        $this->month = $month;
    }

    /**
     * @return int
     */
    public function getDay(): int
    {
        return $this->day;
    }

    /**
     * @param int $day
     */
    public function setDay(int $day): void
    {
        $this->day = $day;
    }

    /**
     * @return int
     */
    public function getHours(): int
    {
        return $this->hours;
    }

    /**
     * @param int $hours
     */
    public function setHours(int $hours): void
    {
        $this->hours = $hours;
    }

    /**
     * @return int
     */
    public function getMinutes(): int
    {
        return $this->minutes;
    }

    /**
     * @param int $minutes
     */
    public function setMinutes(int $minutes): void
    {
        $this->minutes = $minutes;
    }

    /**
     * @return int
     */
    public function getSeconds(): int
    {
        return $this->seconds;
    }

    /**
     * @param int $seconds
     */
    public function setSeconds(int $seconds): void
    {
        $this->seconds = $seconds;
    }

    /**
     * @return float
     */
    public function getLatitude(): float
    {
        return $this->latitude;
    }

    /**
     * @param float $latitude
     */
    public function setLatitude(float $latitude): void
    {
        $this->latitude = $latitude;
    }

    /**
     * @return float
     */
    public function getLongitude(): float
    {
        return $this->longitude;
    }

    /**
     * @param float $longitude
     */
    public function setLongitude(float $longitude): void
    {
        $this->longitude = $longitude;
    }

    /**
     * @return float
     */
    public function getTimezone(): float
    {
        return $this->timezone;
    }

    /**
     * @param float $timezone
     */
    public function setTimezone(float $timezone): void
    {
        $this->timezone = $timezone;
    }


}