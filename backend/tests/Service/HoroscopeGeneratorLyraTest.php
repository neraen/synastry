<?php

namespace App\Tests\Service;

use App\Entity\BirthProfile;
use App\Entity\User;
use App\Enum\TopicLyra;
use App\Repository\CosmicHeadlineRepository;
use App\Repository\DailyHoroscopeRepository;
use App\Service\AstrologyAnalysisService;
use App\Service\HoroscopeGeneratorService;
use App\Service\PlanetaryCalculator;
use App\Service\PsyProfileService;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

/**
 * Lyra chat context: enriched transits (aspect, orb, houses), time windows,
 * and the topic-aware period tool backing get_transits.
 * Uses a real AstrologyAnalysisService so the astronomy is actually computed.
 */
class HoroscopeGeneratorLyraTest extends TestCase
{
    private const PLANETES_FR = [
        'Soleil', 'Lune', 'Mercure', 'Venus', 'Mars',
        'Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton', 'ASC', 'MC',
    ];

    private HoroscopeGeneratorService $service;

    protected function setUp(): void
    {
        $this->service = new HoroscopeGeneratorService(
            new AstrologyAnalysisService(),
            $this->createMock(OpenAiService::class),
            $this->createMock(DailyHoroscopeRepository::class),
            $this->createMock(CosmicHeadlineRepository::class),
            $this->createMock(EntityManagerInterface::class),
            new NullLogger(),
            $this->createMock(PsyProfileService::class)
        );
        $this->service->setLocale('fr');
    }

    private function makeUser(): User
    {
        $profile = new BirthProfile();
        $profile->setFirstName('TestUser');
        $profile->setBirthDate(new \DateTime('1990-06-15'));
        $profile->setBirthTime(new \DateTime('08:30:00'));
        $profile->setLatitude('48.8566');
        $profile->setLongitude('2.3522');
        $profile->setTimezone('2.0');

        $user = new User();
        $user->setBirthProfile($profile);

        return $user;
    }

    public function testHouseOfLongitudeMatchesFullChartPayload()
    {
        $calc = new PlanetaryCalculator('1990-06-15', '06:30', 48.8566, 2.3522, 'Test');
        $payload = $calc->getFullChartPayload();
        $points  = $calc->getAllPoints();

        foreach ($payload['planets'] as $planet => $data) {
            if (!isset($points[$planet])) continue;
            $this->assertSame(
                $data['house'],
                $calc->houseOfLongitude($points[$planet]),
                "houseOfLongitude désaccord pour {$planet}"
            );
        }
    }

    public function testBuildLyraContextEnrichedTransits()
    {
        $contexte = $this->service->buildLyraContext($this->makeUser(), null, TopicLyra::AMOUR);

        $this->assertSame('amour', $contexte['question_domaine']);
        $this->assertIsArray($contexte['transits_actifs']);
        $this->assertLessThanOrEqual(5, count($contexte['transits_actifs']));

        $aujourdhui = (new \DateTime('now', new \DateTimeZone('UTC')))->format('Y-m-d');

        foreach ($contexte['transits_actifs'] as $t) {
            // Nouveaux champs de précision
            $this->assertContains($t['transit'], self::PLANETES_FR);
            $this->assertContains($t['cible'], self::PLANETES_FR);
            $this->assertContains($t['aspect'], ['conjonction', 'opposition', 'carre', 'trigone', 'sextile']);
            $this->assertIsFloat($t['orbe'] + 0.0);
            $this->assertLessThanOrEqual(3.0, $t['orbe']);
            $this->assertGreaterThanOrEqual(1, $t['maison_cible']);
            $this->assertLessThanOrEqual(12, $t['maison_cible']);
            $this->assertGreaterThanOrEqual(1, $t['maison_transit']);
            $this->assertLessThanOrEqual(12, $t['maison_transit']);
            $this->assertContains($t['nature'], ['soutien', 'tension']);
            $this->assertContains($t['sens'], ['se_renforce', 'se_desserre']);

            // Fenêtres temporelles : ISO ou null, jamais dans le passé
            foreach (['exact_vers', 'se_libere_vers'] as $champ) {
                $this->assertArrayHasKey($champ, $t);
                if ($t[$champ] !== null) {
                    $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $t[$champ]);
                    $this->assertGreaterThanOrEqual($aujourdhui, $t[$champ]);
                }
            }

            // Champs internes jamais exposés au LLM
            $this->assertArrayNotHasKey('force', $t);
            $this->assertArrayNotHasKey('pertinent_domaine', $t);
            $this->assertArrayNotHasKey('_angle', $t);
            $this->assertArrayNotHasKey('_orbe_max', $t);
            $this->assertArrayNotHasKey('_natal_lon', $t);
        }

        // Climat de fond : si présent, maisons du topic amour uniquement (5, 7, 8)
        foreach ($contexte['maisons_en_transit'] ?? [] as $m) {
            $this->assertContains($m['maison'], [5, 7, 8]);
            $this->assertContains($m['planete'], ['Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton']);
        }
    }

    public function testGetTransitsForPeriodStructure()
    {
        $resultat = $this->service->getTransitsForPeriod($this->makeUser(), 6, 2, TopicLyra::TRAVAIL);

        $debutAttendu = (new \DateTime('now', new \DateTimeZone('UTC')))->modify('+6 months');
        $this->assertSame($debutAttendu->format('Y-m-01'), $resultat['periode']['debut']);

        $this->assertNotEmpty($resultat['transits']);
        $this->assertLessThanOrEqual(6, count($resultat['transits']));

        foreach ($resultat['transits'] as $t) {
            $this->assertContains($t['transit'], self::PLANETES_FR);
            $this->assertLessThanOrEqual(3.0, $t['orbe']);
            $this->assertGreaterThanOrEqual($resultat['periode']['debut'], $t['culmine_vers']);
            $this->assertLessThanOrEqual($resultat['periode']['fin'], $t['culmine_vers']);
            $this->assertArrayNotHasKey('force', $t);
            $this->assertArrayNotHasKey('_natal_lon', $t);
            // 'sens' contredit culmine_vers à l'échelle d'une fenêtre de plusieurs mois
            $this->assertArrayNotHasKey('sens', $t);
        }
    }

    public function testGetTransitsForPeriodWithoutProfile()
    {
        $resultat = $this->service->getTransitsForPeriod(new User(), 3);

        $this->assertNull($resultat['periode']);
        $this->assertSame([], $resultat['transits']);
    }
}
