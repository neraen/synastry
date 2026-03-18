<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

class SynastryDTO
{
    private string $userName;
    private EphemerisDTO $userTheme;
    private string $partnerName;
    private EphemerisDTO $partnerTheme;

    private ?string $question;


    public function getUserName(): string
    {
        return $this->userName;
    }

    public function getUserTheme(): EphemerisDTO
    {
        return $this->userTheme;
    }

    public function getPartnerName(): string
    {
        return $this->partnerName;
    }

    public function getPartnerTheme(): EphemerisDTO
    {
        return $this->partnerTheme;
    }

    public function getQuestion(): string
    {
        return $this->question;
    }

    /**
     * @param string $userName
     */
    public function setUserName(string $userName): void
    {
        $this->userName = $userName;
    }

    /**
     * @param EphemerisDTO $userTheme
     */
    public function setUserTheme(EphemerisDTO $userTheme): void
    {
        $this->userTheme = $userTheme;
    }

    /**
     * @param string $partnerName
     */
    public function setPartnerName(string $partnerName): void
    {
        $this->partnerName = $partnerName;
    }

    /**
     * @param EphemerisDTO $partnerTheme
     */
    public function setPartnerTheme(EphemerisDTO $partnerTheme): void
    {
        $this->partnerTheme = $partnerTheme;
    }

    /**
     * @param string $question
     */
    public function setQuestion(string $question): void
    {
        $this->question = $question;
    }


}