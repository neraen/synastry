<?php

namespace App\Tests\Service\Rectification\Fixtures;

/**
 * Reference birth data for the rectification test suite.
 *
 * IMPORTANT — the UTC offset is part of the fixture data, never recomputed.
 * Historical daylight-saving rules are the single most common source of a
 * forty-minute error in this module, so each profile declares the offset that
 * applied at that place on that date, and the tests convert local -> UTC by
 * subtracting it verbatim. If a fixture is ever replaced with a profile from a
 * rated birth-data source, copy that source's stated offset here rather than
 * asking any timezone database to derive it.
 *
 * The six level-1 profiles deliberately cover the edge cases where angle
 * calculations break:
 *   - southern hemisphere (latitude sign in the Ascendant formula)
 *   - high latitude (fast-rising and slow-rising signs, near-degenerate horizon)
 *   - birth minutes before midnight (civil date vs UTC date rollover)
 *   - a summer-time year (offset that differs from the standard one)
 *   - a western longitude past the date-line-free but negative-longitude case
 *   - equatorial latitude (tan(phi) near zero in the Ascendant denominator)
 */
final class RectificationFixtures
{
    /**
     * Level 1 — natal angle fixtures.
     *
     * `expected_asc` / `expected_mc` are ecliptic longitudes in degrees. They
     * are asserted to the arc-minute (1/60 deg) against both the production
     * calculator and the independent geometric reference implementation.
     *
     * @return array<string, array{
     *     label: string,
     *     local_date: string,
     *     local_time: string,
     *     utc_offset: float,
     *     latitude: float,
     *     longitude: float,
     *     expected_asc: float,
     *     expected_mc: float,
     *     note: string
     * }>
     */
    public static function level1Angles(): array
    {
        return [
            'paris_summer_time' => [
                'label'        => 'Paris, heure d\'été (UTC+2)',
                'local_date'   => '1985-07-14',
                'local_time'   => '03:20',
                'utc_offset'   => 2.0,
                'latitude'     => 48.8566,
                'longitude'    => 2.3522,
                'expected_asc' => 73.82490334,
                'expected_mc'  => 311.75332264,
                'note'         => 'Offset d\'été français. Une lecture en UTC+1 décalerait l\'ASC de ~15°.',
            ],
            'sydney_southern' => [
                'label'        => 'Sydney, hémisphère sud (UTC+11)',
                'local_date'   => '1978-11-22',
                'local_time'   => '16:45',
                'utc_offset'   => 11.0,
                'latitude'     => -33.8688,
                'longitude'    => 151.2093,
                'expected_asc' => 23.82012121,
                'expected_mc'  => 296.31049560,
                'note'         => 'Latitude négative : piège du signe de tan(phi) dans la formule de l\'ASC.',
            ],
            'reykjavik_high_latitude' => [
                'label'        => 'Reykjavík, haute latitude (UTC+0)',
                'local_date'   => '1992-01-09',
                'local_time'   => '09:05',
                'utc_offset'   => 0.0,
                'latitude'     => 64.1466,
                'longitude'    => -21.9426,
                'expected_asc' => 254.72665842,
                'expected_mc'  => 224.93596951,
                'note'         => 'Signes à montée très rapide/lente : l\'ASC bouge de plusieurs degrés par minute.',
            ],
            'lyon_near_midnight' => [
                'label'        => 'Lyon, naissance juste avant minuit (UTC+1)',
                'local_date'   => '2001-03-03',
                'local_time'   => '23:58',
                'utc_offset'   => 1.0,
                'latitude'     => 45.7640,
                'longitude'    => 4.8357,
                'expected_asc' => 225.79410306,
                'expected_mc'  => 148.98452129,
                'note'         => 'Bascule de date civile : 23h58 locale = 22h58 UTC le même jour, mais la fenêtre de rectification chevauche deux dates.',
            ],
            'toulouse_1976_dst' => [
                'label'        => 'Toulouse 1976, rétablissement de l\'heure d\'été (UTC+2)',
                'local_date'   => '1976-06-15',
                'local_time'   => '14:30',
                'utc_offset'   => 2.0,
                'latitude'     => 43.6047,
                'longitude'    => 1.4442,
                'expected_asc' => 182.20457877,
                'expected_mc'  => 92.62246925,
                'note'         => 'Année du retour de l\'heure d\'été en France : offset historique non déductible du fuseau actuel.',
            ],
            'quito_equator_west' => [
                'label'        => 'Quito, quasi-équateur, longitude ouest (UTC-5)',
                'local_date'   => '1969-10-02',
                'local_time'   => '06:15',
                'utc_offset'   => -5.0,
                'latitude'     => -0.1807,
                'longitude'    => -78.4678,
                'expected_asc' => 192.28192763,
                'expected_mc'  => 100.36991874,
                'note'         => 'tan(phi) ~ 0 et longitude négative : dénominateur de l\'ASC quasi dégénéré.',
            ],
        ];
    }

    /**
     * Level 2 — technique fixtures.
     *
     * Solar-arc directed angles at a given date, and the orb entry/exit dates
     * of the slow planets on the natal Ascendant. These are the values the
     * rectification engine actually consumes, so an error here is invisible in
     * level 1 but shifts every posterior.
     *
     * `expected_arc` is the solar arc in degrees at the given date. It is close
     * to one degree per year lived, but not equal to it: the Sun's daily motion
     * ranges from 0.953 deg near aphelion to 1.019 deg near perihelion, so a
     * July-born and a January-born subject accumulate visibly different arcs
     * over the same lifespan. A fixture where every arc equals the age exactly
     * would mean the day-for-a-year mapping had been replaced by a constant.
     *
     * `transits` lists every orb passage in the scan window, retrograde
     * re-crossings included — a slow planet typically hits a natal degree three
     * times, and an engine that reports one has an ephemeris problem.
     *
     * @return array<string, array{
     *     profile: string,
     *     solar_arc: list<array{date: string, expected_arc: float}>,
     *     transits: list<array{planet: string, from: string, until: string, expected: list<array{aspect: string, entry: string, exit: string}>}>
     * }>
     */
    public static function level2Techniques(): array
    {
        return [
            'paris_summer_time' => [
                'profile'   => 'paris_summer_time',
                'solar_arc' => [
                    // ~20,7 ans de vie, Soleil d'été (lent) : arc < âge.
                    ['date' => '2006-04-01', 'expected_arc' => 19.78934949],
                    ['date' => '2016-09-18', 'expected_arc' => 29.82572107],
                ],
                'transits' => [
                    [
                        'planet'   => 'Saturn',
                        'from'     => '1998-01-01',
                        'until'    => '2006-12-31',
                        // Saturne en Gémeaux en 2001-2002 : triple passage sur
                        // l'ASC natal (13°49' Gémeaux), rétrogradation comprise.
                        'expected' => [
                            ['aspect' => 'conjunction', 'entry' => '2001-08-10', 'exit' => '2001-09-22'],
                            ['aspect' => 'conjunction', 'entry' => '2001-10-01', 'exit' => '2001-11-14'],
                            ['aspect' => 'conjunction', 'entry' => '2002-04-26', 'exit' => '2002-05-12'],
                        ],
                    ],
                    [
                        'planet'   => 'Pluto',
                        'from'     => '1985-01-01',
                        'until'    => '2025-12-31',
                        // Pluton vers 13° Sagittaire en 2000-2001, donc en
                        // opposition à l'ASC natal. Une seule opposition dans
                        // toute la vie : c'est ce type de contact rare qui porte
                        // le signal une fois normalisé par le taux de base.
                        'expected' => [
                            ['aspect' => 'opposition', 'entry' => '2000-02-29', 'exit' => '2000-03-30'],
                            ['aspect' => 'opposition', 'entry' => '2000-12-07', 'exit' => '2001-02-05'],
                            ['aspect' => 'opposition', 'entry' => '2001-04-28', 'exit' => '2001-07-19'],
                            ['aspect' => 'opposition', 'entry' => '2001-09-26', 'exit' => '2001-11-29'],
                        ],
                    ],
                ],
            ],
            'sydney_southern' => [
                'profile'   => 'sydney_southern',
                'solar_arc' => [
                    // Naissance de novembre, Soleil proche du périhélie (rapide) :
                    // arc > âge, l'inverse du profil parisien.
                    ['date' => '2003-05-10', 'expected_arc' => 24.81642544],
                ],
                'transits' => [],
            ],
            'quito_equator_west' => [
                'profile'   => 'quito_equator_west',
                'solar_arc' => [
                    ['date' => '1999-01-20', 'expected_arc' => 29.07852936],
                ],
                'transits' => [],
            ],
        ];
    }

    /**
     * Convert a fixture's declared local time to the UTC instant the
     * astronomical code expects. The offset comes from the fixture, never from
     * a timezone lookup.
     *
     * @param array{local_date: string, local_time: string, utc_offset: float} $fixture
     */
    public static function toUtc(array $fixture): \DateTimeImmutable
    {
        $local = new \DateTimeImmutable(
            $fixture['local_date'] . ' ' . $fixture['local_time'],
            new \DateTimeZone('UTC')
        );

        $offsetMinutes = (int) round($fixture['utc_offset'] * 60);

        return $local->modify(sprintf('%+d minutes', -$offsetMinutes));
    }
}
