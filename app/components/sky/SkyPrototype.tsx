/**
 * Ton Ciel — démonstration sur une naissance d'exemple (aucun appel API).
 * Sert à montrer et régler l'expérience sans compte ni profil de naissance.
 */

import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { changeLanguage, isLanguageSupported } from '@/i18n';
import { SkyExperience, type PartnerPositions } from './SkyExperience';
import type { SkyBirth } from './sky-model';

// 14 mars 1994, 21h30 à Toulouse (20h30 UTC). Positions calculées par
// PlanetaryCalculator::getSkyForApi().
const DEMO_BIRTH: SkyBirth = {
    utc: new Date(Date.UTC(1994, 2, 14, 20, 30)),
    latitude: 43.6047,
    longitude: 1.4442,
    planets: {
        Sun: { lon: 354.0325, lat: 0 },
        Moon: { lon: 22.1233, lat: 2.8062 },
        Mercury: { lon: 326.7821, lat: -0.3151 },
        Venus: { lon: 7.787, lat: -1.1394 },
        Mars: { lon: 335.8113, lat: -1.1151 },
        Jupiter: { lon: 224.1777, lat: 1.3462 },
        Saturn: { lon: 335.301, lat: -1.4531 },
        Uranus: { lon: 296.2138, lat: -0.482 },
        Neptune: { lon: 292.346, lat: 0.6278 },
        Pluto: { lon: 238.0926, lat: 14.2194 },
    },
};

// Ciel à deux de démonstration : 28 mars 1993, 15h40 à Lyon.
const DEMO_PARTNERS = [{ id: 1, name: 'Camille' }];
const DEMO_PARTNER_SKY: PartnerPositions = {
    Sun: { lon: 7.9731, lat: 0 },
    Moon: { lon: 67.7438, lat: 0.5954 },
    Mercury: { lon: 341.9481, lat: -0.494 },
    Venus: { lon: 14.2478, lat: 8.168 },
    Mars: { lon: 107.1512, lat: 2.6021 },
    Jupiter: { lon: 189.8622, lat: 1.595 },
    Saturn: { lon: 326.2155, lat: -1.1134 },
    Uranus: { lon: 292.6209, lat: -0.4471 },
    Neptune: { lon: 290.4382, lat: 0.6927 },
    Pluto: { lon: 235.3577, lat: 14.7441 },
};

export default function SkyPrototype() {
    // « ?done=1 » ouvre la démo chasse terminée et constellation nommée
    // (pratique pour montrer le poster ou préparer des captures).
    const { done, lang } = useLocalSearchParams<{ done?: string; lang?: string }>();
    const finished = done === '1';
    // « ?lang=en » force la langue, pour vérifier les traductions sans changer celle de l'appareil.
    useEffect(() => {
        if (lang && isLanguageSupported(lang)) changeLanguage(lang);
    }, [lang]);

    return (
        <SkyExperience
            birth={DEMO_BIRTH}
            initialDiscovered={finished ? 0b1111111111 : 0}
            initialName={finished ? "L'Hirondelle" : null}
            subtitle="14 mars 1994 · 21h30 · Toulouse"
            partners={DEMO_PARTNERS}
            loadPartner={async () => DEMO_PARTNER_SKY}
            onClose={() => router.back()}
        />
    );
}
