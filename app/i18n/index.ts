/**
 * Internationalization (i18n) Configuration
 *
 * Uses i18next with expo-localization for automatic locale detection
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';

// Supported languages
export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

// Get device language, fallback to default
const getDeviceLanguage = (): SupportedLanguage => {
    try {
        const Localization = require('expo-localization');
        const deviceLocale = Localization.getLocales()[0]?.languageCode || DEFAULT_LANGUAGE;

        // Check if device language is supported
        if (SUPPORTED_LANGUAGES.includes(deviceLocale as SupportedLanguage)) {
            return deviceLocale as SupportedLanguage;
        }
    } catch (e) {
        console.warn('expo-localization not available, using default language');
    }

    return DEFAULT_LANGUAGE;
};

// Resources
const resources = {
    fr: { translation: fr },
    en: { translation: en },
};

// Initialize i18next
i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getDeviceLanguage(),
        fallbackLng: DEFAULT_LANGUAGE,
        compatibilityJSON: 'v4',
        interpolation: {
            escapeValue: false, // React already handles escaping
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;

/**
 * Get the current language
 */
export const getCurrentLanguage = (): SupportedLanguage => {
    return (i18n.language as SupportedLanguage) || DEFAULT_LANGUAGE;
};

/**
 * Change the app language
 */
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
    await i18n.changeLanguage(language);
};

/**
 * Check if a language is supported
 */
export const isLanguageSupported = (language: string): language is SupportedLanguage => {
    return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
};
