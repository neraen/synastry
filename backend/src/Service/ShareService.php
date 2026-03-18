<?php

namespace App\Service;

use App\DTO\CompatibilityShareDTO;
use App\Entity\CompatibilityShare;
use App\Entity\User;
use App\Repository\CompatibilityShareRepository;
use App\Repository\SynastryHistoryRepository;
use Doctrine\ORM\EntityManagerInterface;

class ShareService
{
    private const SHARE_ID_LENGTH = 8;
    private const SHARE_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (I, O, 0, 1)

    public function __construct(
        private CompatibilityShareRepository $shareRepository,
        private SynastryHistoryRepository $synastryHistoryRepository,
        private EntityManagerInterface $entityManager,
        private string $appBaseUrl = 'https://astromatch.app',
    ) {}

    /**
     * Create or retrieve a share for a synastry history
     */
    public function createShare(User $user, int $synastryHistoryId): array
    {
        // Check if synastry history exists and belongs to user
        $synastryHistory = $this->synastryHistoryRepository->findOneByUserAndId($user, $synastryHistoryId);

        if (!$synastryHistory) {
            return [
                'success' => false,
                'error' => 'Analyse de compatibilité non trouvée',
            ];
        }

        // Check if share already exists
        $existingShare = $this->shareRepository->findBySynastryHistoryId($synastryHistoryId);

        if ($existingShare) {
            $dto = new CompatibilityShareDTO($existingShare->getShareId(), $this->appBaseUrl);
            return [
                'success' => true,
                'share' => $dto->toArray(),
                'cached' => true,
            ];
        }

        // Generate unique shareId
        $shareId = $this->generateUniqueShareId();

        // Extract summary from analysis (first 200 chars or first paragraph)
        $summary = $this->extractSummary($synastryHistory->getAnalysis());

        // Get user name from birth profile
        $userBirthProfile = $user->getBirthProfile();
        $userOneName = $userBirthProfile?->getFirstName() ?? 'Vous';

        // Create new share
        $share = new CompatibilityShare();
        $share->setUser($user);
        $share->setShareId($shareId);
        $share->setSynastryHistoryId($synastryHistoryId);
        $share->setUserOneName($userOneName);
        $share->setUserTwoName($synastryHistory->getPartnerName());
        $share->setCompatibilityScore($synastryHistory->getCompatibilityScore() ?? 0);
        $share->setSummary($summary);
        $share->setUserOnePositions($synastryHistory->getUserPositions() ?? []);
        $share->setUserTwoPositions($synastryHistory->getPartnerPositions() ?? []);
        $share->setCompatibilityDetails($synastryHistory->getCompatibilityDetails());

        $this->entityManager->persist($share);
        $this->entityManager->flush();

        $dto = new CompatibilityShareDTO($shareId, $this->appBaseUrl);

        return [
            'success' => true,
            'share' => $dto->toArray(),
            'cached' => false,
        ];
    }

    /**
     * Get share data for public display
     */
    public function getPublicShare(string $shareId): array
    {
        $share = $this->shareRepository->findByShareId($shareId);

        if (!$share) {
            return [
                'success' => false,
                'error' => 'Lien de partage invalide ou expiré',
            ];
        }

        if ($share->isExpired()) {
            return [
                'success' => false,
                'error' => 'Ce lien de partage a expiré',
            ];
        }

        return [
            'success' => true,
            'data' => $share->toPublicArray(),
        ];
    }

    /**
     * Generate share image data
     */
    public function getShareImageData(string $shareId): ?array
    {
        $share = $this->shareRepository->findByShareId($shareId);

        if (!$share || $share->isExpired()) {
            return null;
        }

        return [
            'nameOne' => $share->getUserOneName(),
            'nameTwo' => $share->getUserTwoName(),
            'score' => $share->getCompatibilityScore(),
            'sunOne' => $share->getUserOnePositions()['Sun']['Sign'] ?? null,
            'sunTwo' => $share->getUserTwoPositions()['Sun']['Sign'] ?? null,
            'moonOne' => $share->getUserOnePositions()['Moon']['Sign'] ?? null,
            'moonTwo' => $share->getUserTwoPositions()['Moon']['Sign'] ?? null,
            'summary' => $share->getSummary(),
        ];
    }

    /**
     * Generate unique 8-character share ID
     */
    private function generateUniqueShareId(): string
    {
        $maxAttempts = 10;
        $attempt = 0;

        do {
            $shareId = $this->generateRandomId();
            $exists = $this->shareRepository->shareIdExists($shareId);
            $attempt++;
        } while ($exists && $attempt < $maxAttempts);

        if ($exists) {
            throw new \RuntimeException('Unable to generate unique share ID');
        }

        return $shareId;
    }

    /**
     * Generate random ID string
     */
    private function generateRandomId(): string
    {
        $chars = self::SHARE_ID_CHARS;
        $length = self::SHARE_ID_LENGTH;
        $id = '';

        for ($i = 0; $i < $length; $i++) {
            $id .= $chars[random_int(0, strlen($chars) - 1)];
        }

        return $id;
    }

    /**
     * Extract a clean summary from the analysis text
     */
    private function extractSummary(string $analysis): string
    {
        // Remove markdown formatting
        $clean = preg_replace('/\*\*([^*]+)\*\*/', '$1', $analysis);
        $clean = preg_replace('/\*([^*]+)\*/', '$1', $clean);

        // Try to get the resume/headline section
        if (preg_match('/résumé[:\s]*(.+?)(?:\n\n|$)/is', $clean, $matches)) {
            return trim(mb_substr($matches[1], 0, 200));
        }

        // Get first paragraph or first 200 chars
        $paragraphs = preg_split('/\n\n+/', $clean);
        $firstParagraph = trim($paragraphs[0] ?? '');

        if (mb_strlen($firstParagraph) > 200) {
            return mb_substr($firstParagraph, 0, 197) . '...';
        }

        return $firstParagraph ?: 'Découvrez votre compatibilité cosmique.';
    }
}
