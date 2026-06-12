<?php

namespace App\Service;

use Firebase\JWT\JWT;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Handles Apple OAuth token exchange and revocation.
 *
 * Apple requires apps offering Sign in with Apple to revoke user tokens
 * when the account is deleted (App Store guideline 5.1.1(v)).
 * The refresh token is obtained by exchanging the authorization code at
 * login time, then stored on the User and revoked on account deletion.
 */
class AppleTokenService
{
    private const TOKEN_URL = 'https://appleid.apple.com/auth/token';
    private const REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
    private const AUDIENCE = 'https://appleid.apple.com';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,
        private readonly string $appleClientId,
        private readonly string $appleTeamId,
        private readonly string $appleKeyId,
        private readonly string $applePrivateKeyPath,
    ) {
    }

    public function isConfigured(): bool
    {
        return $this->appleTeamId !== ''
            && $this->appleKeyId !== ''
            && $this->applePrivateKeyPath !== ''
            && is_readable($this->applePrivateKeyPath);
    }

    /**
     * Exchange the authorization code received at sign-in for tokens.
     * Returns the refresh token, or null on failure.
     */
    public function exchangeAuthorizationCode(string $code): ?string
    {
        $clientSecret = $this->generateClientSecret();
        if ($clientSecret === null) {
            return null;
        }

        try {
            $response = $this->httpClient->request('POST', self::TOKEN_URL, [
                'body' => [
                    'client_id' => $this->appleClientId,
                    'client_secret' => $clientSecret,
                    'code' => $code,
                    'grant_type' => 'authorization_code',
                ],
            ]);

            if ($response->getStatusCode() !== 200) {
                $this->logger->warning('Apple token exchange failed', [
                    'status' => $response->getStatusCode(),
                    'body' => $response->getContent(false),
                ]);

                return null;
            }

            return $response->toArray()['refresh_token'] ?? null;
        } catch (\Throwable $e) {
            $this->logger->warning('Apple token exchange error', ['exception' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Revoke an Apple refresh token. Returns true on success.
     * Failures are logged but must not block account deletion.
     */
    public function revokeRefreshToken(string $refreshToken): bool
    {
        $clientSecret = $this->generateClientSecret();
        if ($clientSecret === null) {
            return false;
        }

        try {
            $response = $this->httpClient->request('POST', self::REVOKE_URL, [
                'body' => [
                    'client_id' => $this->appleClientId,
                    'client_secret' => $clientSecret,
                    'token' => $refreshToken,
                    'token_type_hint' => 'refresh_token',
                ],
            ]);

            if ($response->getStatusCode() === 200) {
                return true;
            }

            $this->logger->warning('Apple token revocation failed', [
                'status' => $response->getStatusCode(),
                'body' => $response->getContent(false),
            ]);

            return false;
        } catch (\Throwable $e) {
            $this->logger->warning('Apple token revocation error', ['exception' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Client secret = ES256 JWT signed with the Apple private key (.p8).
     */
    private function generateClientSecret(): ?string
    {
        if (!$this->isConfigured()) {
            $this->logger->warning('AppleTokenService not configured (APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY_PATH)');

            return null;
        }

        try {
            $privateKey = file_get_contents($this->applePrivateKeyPath);
            $now = time();

            return JWT::encode(
                [
                    'iss' => $this->appleTeamId,
                    'iat' => $now,
                    'exp' => $now + 600,
                    'aud' => self::AUDIENCE,
                    'sub' => $this->appleClientId,
                ],
                $privateKey,
                'ES256',
                $this->appleKeyId,
            );
        } catch (\Throwable $e) {
            $this->logger->warning('Apple client secret generation failed', ['exception' => $e->getMessage()]);

            return null;
        }
    }
}
