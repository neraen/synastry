/**
 * Purchases Service — RevenueCat wrapper
 *
 * Handles all in-app purchase logic for iOS (App Store) and Android (Google Play).
 *
 * Setup:
 *   1. npx expo install react-native-purchases
 *   2. npx expo run:ios / npx expo run:android  (custom dev build required — not Expo Go)
 *   3. Set EXPO_PUBLIC_RC_API_KEY_IOS and EXPO_PUBLIC_RC_API_KEY_ANDROID in .env
 *   4. Configure products in App Store Connect + Google Play Console
 *   5. Configure offerings in RevenueCat dashboard (https://app.revenuecat.com)
 *
 * RevenueCat product IDs to create:
 *   - astromatch_premium_monthly   (1 month, auto-renewing)
 *   - astromatch_premium_annual    (12 months, auto-renewing)
 *
 * RevenueCat entitlement to create:
 *   - premium  (attach both products to it)
 *
 * RevenueCat offering to create:
 *   - default  (with packages: monthly + annual)
 */

import { Platform } from 'react-native';
import Purchases, {
    LOG_LEVEL,
    type PurchasesPackage,
    type CustomerInfo,
    type PurchasesOffering,
} from 'react-native-purchases';

// ─── Config ──────────────────────────────────────────────────────────────────

const RC_API_KEY_IOS     = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '';
const PREMIUM_ENTITLEMENT = 'premium';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Offering {
    monthly: PurchasesPackage | null;
    annual: PurchasesPackage | null;
    /** Raw RC offering for debugging */
    raw: PurchasesOffering | null;
}

export interface PurchaseResult {
    success: boolean;
    isPremium: boolean;
    error?: string;
    /** User cancelled (no error toast needed) */
    cancelled?: boolean;
}

// ─── Initialisation ──────────────────────────────────────────────────────────

/**
 * Call once at app startup (before any purchase call).
 * Safe to call multiple times.
 */
export function configurePurchases(): void {
    if (!RC_API_KEY_IOS && !RC_API_KEY_ANDROID) {
        console.warn('[Purchases] RevenueCat API keys not set. Set EXPO_PUBLIC_RC_API_KEY_IOS / EXPO_PUBLIC_RC_API_KEY_ANDROID.');
        return;
    }

    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;

    Purchases.setLogLevel(LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
}

/**
 * Call after a successful login to link purchases to the user account.
 * RevenueCat uses this ID to sync entitlements across devices.
 */
export async function identifyPurchasesUser(userId: string): Promise<void> {
    try {
        await Purchases.logIn(userId);
    } catch (e) {
        console.warn('[Purchases] identifyUser failed:', e);
    }
}

/**
 * Call after logout so the next user starts with a clean anonymous session.
 */
export async function resetPurchasesUser(): Promise<void> {
    try {
        await Purchases.logOut();
    } catch (e) {
        // logOut throws if already anonymous, safe to ignore
    }
}

// ─── Offerings ───────────────────────────────────────────────────────────────

/**
 * Fetches available subscription packages from RevenueCat / stores.
 * Returns null if RC is not configured or network fails.
 */
export async function getOffering(): Promise<Offering | null> {
    try {
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;

        if (!current) return null;

        const monthly = current.availablePackages.find(
            (p) => p.packageType === 'MONTHLY' || p.identifier.includes('monthly')
        ) ?? null;

        const annual = current.availablePackages.find(
            (p) => p.packageType === 'ANNUAL' || p.identifier.includes('annual')
        ) ?? null;

        return { monthly, annual, raw: current };
    } catch (e) {
        console.warn('[Purchases] getOffering failed:', e);
        return null;
    }
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

/**
 * Initiates the native purchase sheet for a given package.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
    try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return {
            success: true,
            isPremium: isPremiumFromCustomerInfo(customerInfo),
        };
    } catch (e: any) {
        if (e?.userCancelled) {
            return { success: false, isPremium: false, cancelled: true };
        }
        return {
            success: false,
            isPremium: false,
            error: e?.message ?? 'Erreur lors de l\'achat',
        };
    }
}

// ─── Restore ─────────────────────────────────────────────────────────────────

/**
 * Restores previous purchases (required by App Store / Google Play guidelines).
 */
export async function restorePurchases(): Promise<PurchaseResult> {
    try {
        const customerInfo = await Purchases.restorePurchases();
        const isPremium = isPremiumFromCustomerInfo(customerInfo);
        return {
            success: true,
            isPremium,
            error: isPremium ? undefined : 'Aucun achat actif trouvé sur ce compte',
        };
    } catch (e: any) {
        return {
            success: false,
            isPremium: false,
            error: e?.message ?? 'Erreur lors de la restauration',
        };
    }
}

// ─── Status check ─────────────────────────────────────────────────────────────

/**
 * Checks the current premium status from RevenueCat (network call).
 */
export async function checkPremiumStatus(): Promise<boolean> {
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return isPremiumFromCustomerInfo(customerInfo);
    } catch {
        return false;
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPremiumFromCustomerInfo(info: CustomerInfo): boolean {
    return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}