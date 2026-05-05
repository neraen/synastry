<?php

namespace App\Service;

use App\Entity\UserPushToken;
use App\Repository\UserPushTokenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class ExpoPushService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
    private const BATCH_SIZE = 100;

    public function __construct(
        private HttpClientInterface $client,
        private UserPushTokenRepository $tokenRepository,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger,
        private string $expoAccessToken = '',
    ) {}

    /**
     * Send push notifications to a list of Expo push tokens.
     *
     * @param string[] $tokens  Array of ExponentPushToken[...] strings
     * @param string   $title   Notification title
     * @param string   $body    Notification body
     * @param array    $data    Extra data for deep linking
     */
    public function send(array $tokens, string $title, string $body, array $data = []): void
    {
        if (empty($tokens)) {
            return;
        }

        $batches = array_chunk($tokens, self::BATCH_SIZE);

        foreach ($batches as $batch) {
            $messages = array_map(fn($token) => [
                'to'    => $token,
                'title' => $title,
                'body'  => $body,
                'data'  => $data,
                'sound' => 'default',
            ], $batch);

            $this->sendBatch($messages);
        }
    }

    /**
     * @param array{to: string, title: string, body: string, data: array}[] $messages
     */
    private function sendBatch(array $messages): void
    {
        $headers = [
            'Content-Type'    => 'application/json',
            'Accept'          => 'application/json',
            'Accept-Encoding' => 'gzip, deflate',
        ];

        if ($this->expoAccessToken) {
            $headers['Authorization'] = 'Bearer ' . $this->expoAccessToken;
        }

        try {
            $response = $this->client->request('POST', self::EXPO_PUSH_URL, [
                'headers' => $headers,
                'json'    => $messages,
                'timeout' => 30,
            ]);

            $statusCode = $response->getStatusCode();
            if ($statusCode !== 200) {
                $this->logger->error('Expo push API returned non-200', ['status' => $statusCode]);
                return;
            }

            $result = $response->toArray(false);
            $this->handlePushReceipts($messages, $result['data'] ?? []);

        } catch (\Throwable $e) {
            $this->logger->error('Expo push send failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Handle Expo push receipts: deactivate tokens that are no longer registered.
     */
    private function handlePushReceipts(array $messages, array $receipts): void
    {
        foreach ($receipts as $index => $receipt) {
            if (($receipt['status'] ?? '') === 'error') {
                $details = $receipt['details'] ?? [];
                if (($details['error'] ?? '') === 'DeviceNotRegistered') {
                    $token = $messages[$index]['to'] ?? null;
                    if ($token) {
                        $this->deactivateToken($token);
                    }
                }
                $this->logger->warning('Expo push error', [
                    'error'   => $receipt['message'] ?? 'unknown',
                    'details' => $details,
                ]);
            }
        }
    }

    private function deactivateToken(string $tokenString): void
    {
        $token = $this->tokenRepository->findByToken($tokenString);
        if ($token) {
            $token->setIsActive(false);
            $this->entityManager->flush();
            $this->logger->info('Deactivated push token', ['token' => substr($tokenString, 0, 30) . '...']);
        }
    }
}
