<?php

namespace App\Service;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class AppleAuthService
{
    private const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
    private const APPLE_ISSUER = 'https://appleid.apple.com';

    private ?array $cachedKeys = null;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $appleClientId,
    ) {
    }

    /**
     * Verify an Apple ID token and return the payload
     *
     * @return array{sub: string, email: string|null}|null
     */
    public function verifyIdToken(string $idToken): ?array
    {
        try {
            $keys = $this->getApplePublicKeys();
            if ($keys === null) {
                return null;
            }

            $payload = JWT::decode($idToken, JWK::parseKeySet($keys));
            $payloadArray = (array) $payload;

            // Verify issuer
            if (!isset($payloadArray['iss']) || $payloadArray['iss'] !== self::APPLE_ISSUER) {
                return null;
            }

            // Verify audience
            if (!isset($payloadArray['aud']) || $payloadArray['aud'] !== $this->appleClientId) {
                return null;
            }

            // Verify expiration
            if (!isset($payloadArray['exp']) || (int) $payloadArray['exp'] < time()) {
                return null;
            }

            // Check required fields
            if (!isset($payloadArray['sub'])) {
                return null;
            }

            return [
                'sub' => $payloadArray['sub'],
                'email' => $payloadArray['email'] ?? null,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Fetch Apple's public keys for JWT verification
     */
    private function getApplePublicKeys(): ?array
    {
        if ($this->cachedKeys !== null) {
            return $this->cachedKeys;
        }

        try {
            $response = $this->httpClient->request('GET', self::APPLE_KEYS_URL);

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $this->cachedKeys = $response->toArray();
            return $this->cachedKeys;
        } catch (\Throwable) {
            return null;
        }
    }
}
