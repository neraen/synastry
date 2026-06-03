<?php

namespace App\Service;

use App\Entity\User;
use App\Entity\UserPsyProfile;
use App\Repository\NatalChartSectionRepository;
use App\Repository\UserPsyProfileRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Builds, stores and serves the compact psychological digest.
 *
 * Extracted ONCE per user from the persisted natal analysis (natal_chart_section),
 * then injected as lean context into the Lyra chat and the daily horoscope.
 * Never regenerated unless the stored version is bumped (or extraction was missing).
 */
class PsyProfileService
{
    /** Bump to force re-extraction of every user's digest. */
    public const VERSION = 1;

    /** Question/angle domain (from classifierDomaine / house) -> which axis to inject. */
    private const AXE_PAR_DOMAINE = [
        'argent'  => 'argent_securite',
        'travail' => 'travail',
        'amour'   => 'amour',
        'sante'   => 'rapport_a_soi',
        'sens'    => 'rapport_a_soi',
    ];

    /** Sections carrying the richest psychological material (aspects excluded: structured list). */
    private const SOURCE_SECTIONS = ['synthesis', 'identity', 'emotions', 'mental', 'relationships', 'ambition', 'mission'];

    public function __construct(
        private NatalChartSectionRepository $sectionRepository,
        private UserPsyProfileRepository $psyProfileRepository,
        private OpenAiService $openAiService,
        private EntityManagerInterface $em,
        private LoggerInterface $logger,
    ) {}

    /**
     * Load the stored digest. If absent (or stale version) and $autoGenerate,
     * extract once, store, and return it. Best-effort: returns null on any
     * failure so chat/horoscope never break.
     */
    public function getData(User $user, bool $autoGenerate = true): ?array
    {
        $record = $this->psyProfileRepository->findByUser($user);
        if ($record !== null && $record->getVersion() === self::VERSION) {
            $data = $record->getData();
            return is_array($data) ? $data : null;
        }

        if (!$autoGenerate) {
            return null;
        }

        return $this->extract($user);
    }

    /**
     * One-time extraction from the persisted natal analysis sections.
     * Persists the digest and returns its data, or null if it cannot be built
     * (sections not generated yet, or extraction failed).
     */
    public function extract(User $user): ?array
    {
        $source = $this->buildSourceText($this->sectionRepository->findAllForUser($user));
        if ($source === '') {
            return null; // natal sections not generated yet — nothing to extract from
        }

        try {
            $result = $this->openAiService->extractPsyProfile($source);
        } catch (\Throwable $e) {
            $this->logger->error('psy_profile.extract_failed', [
                'user_id' => $user->getId(),
                'error'   => $e->getMessage(),
            ]);
            return null;
        }

        if (!($result['success'] ?? false) || empty($result['data'])) {
            $this->logger->warning('psy_profile.extract_invalid', [
                'user_id' => $user->getId(),
                'error'   => $result['error'] ?? 'unknown',
            ]);
            return null;
        }

        $data = $result['data'];

        $record = $this->psyProfileRepository->findByUser($user);
        if ($record === null) {
            $record = new UserPsyProfile();
            $record->setUser($user);
            $this->em->persist($record);
        }
        $record->setVersion(self::VERSION);
        $record->setGenereLe(new \DateTime());
        $record->setData($data);
        $this->em->flush();

        return $data;
    }

    /**
     * Lean context for injection: always the noyau, plus the single axis relevant
     * to the domain (or no axis if the domain is unknown/general).
     */
    public function profilPourContexte(array $profil, ?string $domaine = null): array
    {
        $noyau = [
            'patterns'            => $profil['patterns'] ?? [],
            'besoins_fond'        => $profil['besoins_fond'] ?? [],
            'reflexe_sous_stress' => $profil['reflexe_sous_stress'] ?? null,
            'sensibilites'        => $profil['sensibilites'] ?? null,
        ];

        if ($domaine !== null && isset(self::AXE_PAR_DOMAINE[$domaine])) {
            $axe = $profil['axes'][self::AXE_PAR_DOMAINE[$domaine]] ?? null;
            if ($axe !== null && $axe !== '') {
                $noyau['axe'] = $axe;
            }
        }

        return $noyau;
    }

    /**
     * Concatenate the persisted analysis sections into a single readable blob
     * for the extraction prompt.
     *
     * @param \App\Entity\NatalChartSection[] $sections
     */
    private function buildSourceText(array $sections): string
    {
        $parts = [];
        foreach ($sections as $section) {
            $name = $section->getSection();
            if (!in_array($name, self::SOURCE_SECTIONS, true)) {
                continue;
            }
            $text = $this->sectionToText($section->getContent());
            if ($text !== '') {
                $parts[] = "## {$name}\n{$text}";
            }
        }

        return implode("\n\n", $parts);
    }

    /** Flatten a section's stored content (string, or synthesis {portrait, axes, ...}) to text. */
    private function sectionToText(mixed $content): string
    {
        if (is_string($content)) {
            return trim($content);
        }

        if (is_array($content)) {
            $bits = [];
            if (!empty($content['portrait']) && is_string($content['portrait'])) {
                $bits[] = $content['portrait'];
            }
            if (!empty($content['axes']) && is_array($content['axes'])) {
                foreach ($content['axes'] as $axe) {
                    if (is_string($axe)) {
                        $bits[] = $axe;
                    } elseif (is_array($axe)) {
                        $bits[] = implode(' : ', array_filter($axe, 'is_string'));
                    }
                }
            }
            return trim(implode("\n", $bits));
        }

        return '';
    }
}
