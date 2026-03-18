<?php

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class GoogleAuthService
{
    private const TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $googleClientId,
    ) {
    }

    /**
     * Verify a Google ID token and return the payload
     *
     * @return array{sub: string, email: string, email_verified: bool}|null
     */
    public function verifyIdToken(string $idToken): ?array
    {
        try {
            $response = $this->httpClient->request('GET', self::TOKEN_INFO_URL, [
                'query' => ['id_token' => $idToken],
            ]);

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $payload = $response->toArray();

            // Verify the audience matches our client ID
            if (!isset($payload['aud']) || $payload['aud'] !== $this->googleClientId) {
                return null;
            }

            // Verify the token hasn't expired
            if (!isset($payload['exp']) || (int) $payload['exp'] < time()) {
                return null;
            }

            // Check required fields
            if (!isset($payload['sub'], $payload['email'])) {
                return null;
            }

            return [
                'sub' => $payload['sub'],
                'email' => $payload['email'],
                'email_verified' => ($payload['email_verified'] ?? 'false') === 'true',
            ];
        } catch (\Throwable) {
            return null;
        }
    }
}
