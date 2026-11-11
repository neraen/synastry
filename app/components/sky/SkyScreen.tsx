/**
 * Ton Ciel — écran branché sur le profil de naissance de l'utilisateur
 * (onglet principal) : charge le ciel, reprend et enregistre la progression.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';
import { ErrorState, LoadingState } from '@/components/ui';
import {
    getBirthSky, getPartnerSky, getSynastryHistory, saveSkyProgress, type BirthSky,
} from '@/services/astrology';
import { SkyExperience, type PartnerPositions, type SkyPartner } from './SkyExperience';
import { PLANET_KEYS, dateFromJulianDay, type PlanetKey, type SkyBirth } from './sky-model';

function toSkyBirth(sky: BirthSky): SkyBirth {
    const planets = {} as Record<PlanetKey, { lon: number; lat: number }>;
    for (const key of PLANET_KEYS) {
        planets[key] = sky.planets[key] ?? { lon: 0, lat: 0 };
    }
    return {
        utc: dateFromJulianDay(sky.julianDay),
        latitude: sky.latitude,
        longitude: sky.longitude,
        planets,
    };
}

/** « 14 mars 1994 · 21h30 · Toulouse » ; en anglais « March 14, 1994 · 9:30 PM · Toulouse » */
function subtitleOf(sky: BirthSky, language: string): string {
    const french = language.startsWith('fr');
    const [y, m, d] = sky.birthDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(french ? 'fr-FR' : 'en-US', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
    const [hours, minutes] = sky.birthTime.split(':');
    const time = french
        ? `${hours}h${minutes}`
        : `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) < 12 ? 'AM' : 'PM'}`;
    return [date, time, sky.city].filter(Boolean).join(' · ');
}

export default function SkyScreen() {
    const { t, i18n } = useTranslation();
    const [sky, setSky] = useState<BirthSky | null>(null);
    // Message du serveur, ou clé de traduction pour nos propres messages.
    const [error, setError] = useState<string | null>(null);

    const [attempt, setAttempt] = useState(0);
    const [partners, setPartners] = useState<SkyPartner[]>([]);

    // Ciel à deux : les personnes déjà comparées dans l'onglet Compatibilité.
    useEffect(() => {
        let cancelled = false;
        getSynastryHistory(12)
            .then((response) => {
                if (cancelled || !response.histories) return;
                setPartners(response.histories.map((h) => ({ id: h.id, name: h.partnerName })));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const loadPartner = async (historyId: number): Promise<PartnerPositions | null> => {
        try {
            const response = await getPartnerSky(historyId);
            const planets = response.partner?.planets;
            if (!planets || PLANET_KEYS.some((key) => !planets[key])) return null;
            return planets as PartnerPositions;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        let cancelled = false;
        getBirthSky()
            .then((response) => {
                if (cancelled) return;
                if (response.success && response.sky) {
                    setSky(response.sky);
                } else {
                    setError(response.error ?? 'sky.computeError');
                }
            })
            .catch(() => {
                if (!cancelled) setError('sky.loadError');
            });
        return () => { cancelled = true; };
    }, [attempt]);

    const retry = () => {
        setError(null);
        setAttempt((n) => n + 1);
    };

    // Échec silencieux : la prochaine découverte renvoie le masque complet, rien n'est perdu.
    const saveDiscoveries = (discovered: number) => {
        saveSkyProgress({ discovered }).catch(() => {});
    };

    const saveName = async (constellationName: string) => {
        try {
            const response = await saveSkyProgress({ constellationName });
            return response.success === true;
        } catch {
            return false;
        }
    };

    const birth = useMemo(() => (sky ? toSkyBirth(sky) : null), [sky]);

    if (sky && birth) {
        return (
            <SkyExperience
                birth={birth}
                subtitle={subtitleOf(sky, i18n.language)}
                timeKnown={sky.timeKnown}
                initialDiscovered={sky.discovered}
                initialName={sky.constellationName}
                onDiscover={saveDiscoveries}
                onName={saveName}
                partners={partners}
                loadPartner={loadPartner}
                bottomInset={0}
            />
        );
    }

    return (
        <View style={styles.root}>
            {error
                ? <ErrorState message={t(error, { defaultValue: error })} onRetry={retry} />
                : <LoadingState message={t('sky.loading')} />}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: colors.sky.zenith,
    },
});
