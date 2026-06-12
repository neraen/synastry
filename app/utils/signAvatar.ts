/**
 * Sign avatar utilities — shared between TabHeader, profile, AstralHero, etc.
 */

export type Gender = 'female' | 'male';

export const SIGN_AVATAR_MAP: Record<string, any> = {
    Aries:       require('@/assets/images/sign-avatar/belier.png'),
    Taurus:      require('@/assets/images/sign-avatar/taureau.png'),
    Gemini:      require('@/assets/images/sign-avatar/gemeau.png'),
    Cancer:      require('@/assets/images/sign-avatar/cancer.png'),
    Leo:         require('@/assets/images/sign-avatar/lion.png'),
    Virgo:       require('@/assets/images/sign-avatar/vierge.png'),
    Libra:       require('@/assets/images/sign-avatar/balance.png'),
    Scorpio:     require('@/assets/images/sign-avatar/scorpion.png'),
    Sagittarius: require('@/assets/images/sign-avatar/sagittaire.png'),
    Capricorn:   require('@/assets/images/sign-avatar/capricorne.png'),
    Aquarius:    require('@/assets/images/sign-avatar/verseau.png'),
    Pisces:      require('@/assets/images/sign-avatar/poisson.png'),
};

export const SIGN_AVATAR_MAP_MALE: Record<string, any> = {
    Aries:       require('@/assets/images/sign-avatar/belier-homme.png'),
    Taurus:      require('@/assets/images/sign-avatar/taureau-homme.png'),
    Gemini:      require('@/assets/images/sign-avatar/gemeau-homme.png'),
    Cancer:      require('@/assets/images/sign-avatar/cancer-homme.png'),
    Leo:         require('@/assets/images/sign-avatar/lion-homme.png'),
    Virgo:       require('@/assets/images/sign-avatar/vierge-homme.png'),
    Libra:       require('@/assets/images/sign-avatar/balance-homme.png'),
    Scorpio:     require('@/assets/images/sign-avatar/scorpion-homme.png'),
    Sagittarius: require('@/assets/images/sign-avatar/sagittaire-homme.png'),
    Capricorn:   require('@/assets/images/sign-avatar/capricorne-homme.png'),
    Aquarius:    require('@/assets/images/sign-avatar/verseau-homme.png'),
    Pisces:      require('@/assets/images/sign-avatar/poisson-homme.png'),
};

/**
 * Derives the sun sign (English key) from a YYYY-MM-DD birth date string.
 * Returns null if the date is invalid or missing.
 */
export function getSunSign(birthDate?: string | null): string | null {
    if (!birthDate) return null;
    const [, mm, dd] = birthDate.split('-').map(Number);
    if (!mm || !dd) return null;

    if ((mm === 3 && dd >= 21) || (mm === 4 && dd <= 19)) return 'Aries';
    if ((mm === 4 && dd >= 20) || (mm === 5 && dd <= 20)) return 'Taurus';
    if ((mm === 5 && dd >= 21) || (mm === 6 && dd <= 20)) return 'Gemini';
    if ((mm === 6 && dd >= 21) || (mm === 7 && dd <= 22)) return 'Cancer';
    if ((mm === 7 && dd >= 23) || (mm === 8 && dd <= 22)) return 'Leo';
    if ((mm === 8 && dd >= 23) || (mm === 9 && dd <= 22)) return 'Virgo';
    if ((mm === 9 && dd >= 23) || (mm === 10 && dd <= 22)) return 'Libra';
    if ((mm === 10 && dd >= 23) || (mm === 11 && dd <= 21)) return 'Scorpio';
    if ((mm === 11 && dd >= 22) || (mm === 12 && dd <= 21)) return 'Sagittarius';
    if ((mm === 12 && dd >= 22) || (mm === 1 && dd <= 19)) return 'Capricorn';
    if ((mm === 1 && dd >= 20) || (mm === 2 && dd <= 18)) return 'Aquarius';
    return 'Pisces';
}

/** Returns the avatar source for a sign key; unknown gender falls back to the default variant. */
export function getSignAvatarBySign(sign?: string | null, gender?: Gender | null): any | null {
    if (!sign) return null;
    const map = gender === 'male' ? SIGN_AVATAR_MAP_MALE : SIGN_AVATAR_MAP;
    return map[sign] ?? null;
}

/** Returns the avatar source for a given birth date, or null if unavailable. */
export function getSignAvatar(birthDate?: string | null, gender?: Gender | null): any | null {
    return getSignAvatarBySign(getSunSign(birthDate), gender);
}
