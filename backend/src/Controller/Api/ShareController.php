<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\ShareService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ShareController extends AbstractController
{
    public function __construct(
        private ShareService $shareService,
    ) {}

    /**
     * Create a share link for a compatibility analysis
     * Requires authentication
     */
    #[Route('/api/compatibility/share', name: 'api_compatibility_share_create', methods: ['POST'])]
    public function createShare(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        if (!$user) {
            return $this->json([
                'success' => false,
                'error' => 'Authentification requise',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['compatibilityId'])) {
            return $this->json([
                'success' => false,
                'error' => 'Le champ compatibilityId est requis',
            ], Response::HTTP_BAD_REQUEST);
        }

        $compatibilityId = (int) $data['compatibilityId'];

        $result = $this->shareService->createShare($user, $compatibilityId);

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_NOT_FOUND);
        }

        return $this->json($result, Response::HTTP_CREATED);
    }

    /**
     * Get public share data
     * No authentication required
     */
    #[Route('/api/share/{shareId}', name: 'api_share_get', methods: ['GET'])]
    public function getShare(string $shareId): JsonResponse
    {
        // Validate shareId format (8 alphanumeric chars)
        if (!preg_match('/^[A-Z0-9]{8}$/', $shareId)) {
            return $this->json([
                'success' => false,
                'error' => 'Format de lien invalide',
            ], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->shareService->getPublicShare($shareId);

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_NOT_FOUND);
        }

        return $this->json($result);
    }

    /**
     * Generate share image (SVG for now, can be enhanced with image library)
     * No authentication required
     */
    #[Route('/api/share/{shareId}/image', name: 'api_share_image', methods: ['GET'])]
    public function getShareImage(string $shareId): Response
    {
        // Validate shareId format
        if (!preg_match('/^[A-Z0-9]{8}$/', $shareId)) {
            return new Response('Invalid share ID', Response::HTTP_BAD_REQUEST);
        }

        $data = $this->shareService->getShareImageData($shareId);

        if (!$data) {
            return new Response('Share not found or expired', Response::HTTP_NOT_FOUND);
        }

        // Generate SVG image
        $svg = $this->generateShareSvg($data);

        return new Response($svg, Response::HTTP_OK, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /**
     * Get OpenGraph meta data for share preview
     */
    #[Route('/api/share/{shareId}/meta', name: 'api_share_meta', methods: ['GET'])]
    public function getShareMeta(string $shareId): JsonResponse
    {
        $result = $this->shareService->getPublicShare($shareId);

        if (!$result['success']) {
            return $this->json([
                'title' => 'AstroMatch - Compatibilité Cosmique',
                'description' => 'Découvrez votre compatibilité astrologique',
                'image' => null,
            ]);
        }

        $data = $result['data'];

        return $this->json([
            'title' => "{$data['nameOne']} & {$data['nameTwo']} - Compatibilité cosmique",
            'description' => $data['summary'],
            'image' => "https://astromatch.app/api/share/{$shareId}/image",
            'score' => $data['compatibilityScore'],
        ]);
    }

    /**
     * Generate SVG image for sharing
     */
    private function generateShareSvg(array $data): string
    {
        $nameOne = htmlspecialchars($data['nameOne'] ?? 'Personne 1');
        $nameTwo = htmlspecialchars($data['nameTwo'] ?? 'Personne 2');
        $score = (int) ($data['score'] ?? 0);
        $sunOne = $this->getZodiacSymbol($data['sunOne'] ?? '');
        $sunTwo = $this->getZodiacSymbol($data['sunTwo'] ?? '');
        $moonOne = $this->getZodiacSymbol($data['moonOne'] ?? '');
        $moonTwo = $this->getZodiacSymbol($data['moonTwo'] ?? '');
        $sunOneName = $this->translateSign($data['sunOne'] ?? '');
        $sunTwoName = $this->translateSign($data['sunTwo'] ?? '');
        $moonOneName = $this->translateSign($data['moonOne'] ?? '');
        $moonTwoName = $this->translateSign($data['moonTwo'] ?? '');
        $summary = htmlspecialchars(mb_substr($data['summary'] ?? '', 0, 100));

        // Score color
        $scoreColor = match (true) {
            $score >= 80 => '#4CC38A',
            $score >= 60 => '#C99A64',
            $score >= 40 => '#F5A623',
            default => '#E5484D',
        };

        return <<<SVG
<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0A1A"/>
      <stop offset="50%" style="stop-color:#1A0A2E"/>
      <stop offset="100%" style="stop-color:#0F0F24"/>
    </linearGradient>
    <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:{$scoreColor};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:{$scoreColor};stop-opacity:0"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bgGradient)"/>

  <!-- Stars -->
  <g fill="white" opacity="0.6">
    <circle cx="100" cy="150" r="1.5"/>
    <circle cx="200" cy="80" r="1"/>
    <circle cx="350" cy="200" r="2"/>
    <circle cx="500" cy="100" r="1.5"/>
    <circle cx="700" cy="180" r="1"/>
    <circle cx="850" cy="120" r="2"/>
    <circle cx="950" cy="200" r="1.5"/>
    <circle cx="150" cy="350" r="1"/>
    <circle cx="900" cy="400" r="1.5"/>
    <circle cx="80" cy="600" r="1"/>
    <circle cx="980" cy="700" r="2"/>
    <circle cx="120" cy="850" r="1.5"/>
    <circle cx="300" cy="950" r="1"/>
    <circle cx="600" cy="980" r="1.5"/>
    <circle cx="800" cy="900" r="2"/>
    <circle cx="950" cy="850" r="1"/>
  </g>

  <!-- Central glow -->
  <ellipse cx="540" cy="450" rx="300" ry="300" fill="url(#glowGradient)"/>

  <!-- Title -->
  <text x="540" y="180" font-family="Georgia, serif" font-size="36" fill="#C99A64" text-anchor="middle" letter-spacing="8">
    COMPATIBILITÉ COSMIQUE
  </text>

  <!-- Names -->
  <text x="540" y="320" font-family="Georgia, serif" font-size="52" fill="white" text-anchor="middle">
    {$nameOne} ✦ {$nameTwo}
  </text>

  <!-- Score circle -->
  <circle cx="540" cy="520" r="140" fill="none" stroke="{$scoreColor}" stroke-width="6" opacity="0.3"/>
  <circle cx="540" cy="520" r="120" fill="none" stroke="{$scoreColor}" stroke-width="4" filter="url(#glow)"/>

  <!-- Score -->
  <text x="540" y="540" font-family="Georgia, serif" font-size="96" fill="{$scoreColor}" text-anchor="middle" font-weight="bold" filter="url(#glow)">
    {$score}%
  </text>

  <!-- Zodiac info -->
  <g font-family="system-ui, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">
    <text x="540" y="720" text-anchor="middle">
      <tspan fill="#C99A64">☉</tspan> {$sunOneName} × {$sunTwoName}
    </text>
    <text x="540" y="770" text-anchor="middle">
      <tspan fill="#9D8DC9">☽</tspan> {$moonOneName} × {$moonTwoName}
    </text>
  </g>

  <!-- Summary -->
  <text x="540" y="860" font-family="Georgia, serif" font-size="24" fill="rgba(255,255,255,0.7)" text-anchor="middle" font-style="italic">
    "{$summary}"
  </text>

  <!-- Footer -->
  <text x="540" y="1020" font-family="system-ui, sans-serif" font-size="20" fill="rgba(255,255,255,0.5)" text-anchor="middle">
    Généré avec AstroMatch ✨
  </text>
</svg>
SVG;
    }

    /**
     * Get zodiac symbol for sign
     */
    private function getZodiacSymbol(string $sign): string
    {
        return match ($sign) {
            'Aries' => '♈',
            'Taurus' => '♉',
            'Gemini' => '♊',
            'Cancer' => '♋',
            'Leo' => '♌',
            'Virgo' => '♍',
            'Libra' => '♎',
            'Scorpio' => '♏',
            'Sagittarius' => '♐',
            'Capricorn' => '♑',
            'Aquarius' => '♒',
            'Pisces' => '♓',
            default => '★',
        };
    }

    /**
     * Translate sign name to French
     */
    private function translateSign(string $sign): string
    {
        return match ($sign) {
            'Aries' => 'Bélier',
            'Taurus' => 'Taureau',
            'Gemini' => 'Gémeaux',
            'Cancer' => 'Cancer',
            'Leo' => 'Lion',
            'Virgo' => 'Vierge',
            'Libra' => 'Balance',
            'Scorpio' => 'Scorpion',
            'Sagittarius' => 'Sagittaire',
            'Capricorn' => 'Capricorne',
            'Aquarius' => 'Verseau',
            'Pisces' => 'Poissons',
            default => $sign,
        };
    }
}
