<?php

namespace App\Controller\Api;

use App\Service\AppleAuthService;
use App\Service\GoogleAuthService;
use App\Service\OAuthUserManager;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/auth')]
class OAuthController extends AbstractController
{
    public function __construct(
        private readonly GoogleAuthService $googleAuthService,
        private readonly AppleAuthService $appleAuthService,
        private readonly OAuthUserManager $oAuthUserManager,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly RefreshTokenGeneratorInterface $refreshTokenGenerator,
        private readonly RefreshTokenManagerInterface $refreshTokenManager,
    ) {
    }

    #[Route('/google', name: 'api_auth_google', methods: ['POST'])]
    public function googleAuth(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!$data || !isset($data['id_token'])) {
            return $this->json([
                'error' => 'id_token is required',
            ], Response::HTTP_BAD_REQUEST);
        }

        $payload = $this->googleAuthService->verifyIdToken($data['id_token']);

        if ($payload === null) {
            return $this->json([
                'error' => 'Invalid or expired Google token',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Verify email is verified for Google accounts
        if (!$payload['email_verified']) {
            return $this->json([
                'error' => 'Email not verified with Google',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $user = $this->oAuthUserManager->findOrCreateUser(
            'google',
            $payload['sub'],
            $payload['email']
        );

        return $this->generateTokenResponse($user);
    }

    #[Route('/apple', name: 'api_auth_apple', methods: ['POST'])]
    public function appleAuth(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!$data || !isset($data['id_token'])) {
            return $this->json([
                'error' => 'id_token is required',
            ], Response::HTTP_BAD_REQUEST);
        }

        $payload = $this->appleAuthService->verifyIdToken($data['id_token']);

        if ($payload === null) {
            return $this->json([
                'error' => 'Invalid or expired Apple token',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Apple may provide email in the first request or via user object
        $email = $payload['email'];
        if ($email === null && isset($data['user']['email'])) {
            $email = $data['user']['email'];
        }

        $user = $this->oAuthUserManager->findOrCreateUser(
            'apple',
            $payload['sub'],
            $email
        );

        return $this->generateTokenResponse($user);
    }

    private function generateTokenResponse(object $user): JsonResponse
    {
        $token = $this->jwtManager->create($user);

        $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl(
            $user,
            (new \DateTime())->modify('+1 year')->getTimestamp() - time()
        );
        $this->refreshTokenManager->save($refreshToken);

        return $this->json([
            'token' => $token,
            'refresh_token' => $refreshToken->getRefreshToken(),
        ]);
    }
}
