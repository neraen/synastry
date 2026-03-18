<?php

namespace App\Service\Webservice;

use App\DTO\EphemerisDTO;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\DecodingExceptionInterface;

class EphemerisService
{
    private HttpClientInterface $client;

    public function __construct(HttpClientInterface $client)
    {
        $this->client = $client;
    }

    public function getPlanetaryPositions(EphemerisDTO $ephemerisDTO): array {
        try {
            $response = $this->client->request('POST',  $_ENV['ASTROAPI_API_URL'].'/western/planets', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'x-api-key' => $_ENV['ASTROAPI_API_KEY'],
                ],
                'json' => [
                    'year' => $ephemerisDTO->getYear(),
                    'month' => $ephemerisDTO->getMonth(),
                    'date' => $ephemerisDTO->getDay(),
                    'hours' => $ephemerisDTO->getHours(),
                    'minutes' => $ephemerisDTO->getMinutes(),
                    'seconds' => $ephemerisDTO->getSeconds(),
                    'latitude' => $ephemerisDTO->getLatitude(),
                    'longitude' => $ephemerisDTO->getLongitude(),
                    "config" => [
                        "observation_point" => "topocentric", /* geocentric or topocentric */
                        "ayanamsha" => "tropical", /*  tropical or sayana or lahiri  */
                        "language" => "en" /* en , te , es , fr , pt , ru , de ,  ja */
                    ],
                    'timezone' => $ephemerisDTO->getTimezone(),
                ],
            ]);

            $data = $response->toArray();

            if (!isset($data['output'])) {

                throw new \Exception("Réponse invalide de l'API FreeAstrologyAPI.");
            }

            return $this->formatForOpenAI($data);
        } catch (TransportExceptionInterface | ClientExceptionInterface | ServerExceptionInterface | DecodingExceptionInterface | \Exception $e) {
            return ['error' => "Erreur lors de la récupération des données : " . $e->getMessage()];
        }
    }

    private function formatForOpenAI(array $data): array
    {
        $formattedData = [];

        foreach ($data['output'] as $planet) {
            $formattedData[$planet['planet']['en']] = [
                'Position' => $planet['normDegree'],
                'Sign' => $planet['zodiac_sign']['name']['en'],
                'Retrograde' => $planet['isRetro'] ? 'Yes' : 'No',
            ];
        }

        return $formattedData;
    }
}
