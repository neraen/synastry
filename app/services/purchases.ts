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
 * RevenueCat product IDs:
 *   - monthly_subscription:premium   (1 month, auto-renewing)
 *   - annual_subscription:premium    (12 months, auto-renewing)
 *
 * RevenueCat entitlement to create:
 *   - premium  (attach both products to it)
 *
 * RevenueCat offering to create:
 *   - default  (with packages: monthly + annual)
 */

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from './api';

// Lazy import to prevent native module crash if billing is unavailable
let Purchases: typeof import('react-native-purchases').default | null = null;
let LOG_LEVEL: typeof import('react-native-purchases').LOG_LEVEL | null = null;
try {
    const mod = require('react-native-purchases');
    Purchases = mod.default ?? mod;
    LOG_LEVEL = mod.LOG_LEVEL;
} catch (e) {
    console.warn('[Purchases] react-native-purchases not available:', e);
}

import type { PurchasesPackage, CustomerInfo, PurchasesOffering } from 'react-native-purchases';

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

/** Tracks whether configure() succeeded — false in Expo Go */
let configured = false;

/**
 * Call once at app startup (before any purchase call).
 * Safe to call multiple times.
 */
export function configurePurchases(): void {
    if (!Purchases) return;
    
    // RevenueCat requires native modules. Expo Go does not have them.
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
        console.warn('[Purchases] Expo Go detected. RevenueCat native module is not available. Skipping configuration.');
        return;
    }

    if (!RC_API_KEY_IOS && !RC_API_KEY_ANDROID) {
        console.warn('[Purchases] RevenueCat API keys not set. Set EXPO_PUBLIC_RC_API_KEY_IOS / EXPO_PUBLIC_RC_API_KEY_ANDROID.');
        return;
    }

    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;

    try {
        if (LOG_LEVEL) Purchases.setLogLevel(LOG_LEVEL.ERROR);
        Purchases.configure({ apiKey });
        configured = true;
    } catch {
        // Purchases will be unavailable until running a real dev/prod build.
    }
}

/**
 * Call after a successful login to link purchases to the user account.
 * RevenueCat uses this ID to sync entitlements across devices.
 */
export async function identifyPurchasesUser(userId: string): Promise<void> {
    if (!configured) return;
    try {
        await Purchases!.logIn(userId);
    } catch (e) {
        console.warn('[Purchases] identifyUser failed:', e);
    }
}

/**
 * Call after logout so the next user starts with a clean anonymous session.
 */
export async function resetPurchasesUser(): Promise<void> {
    if (!configured) return;
    try {
        await Purchases!.logOut();
    } catch {
        // logOut throws if already anonymous, safe to ignore
    }
}

// ─── Offerings ───────────────────────────────────────────────────────────────

/**
 * Fetches available subscription packages from RevenueCat / stores.
 * Returns null if RC is not configured or network fails.
 */
export async function getOffering(): Promise<Offering | null> {
    if (!configured) return null;
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
    if (!configured) return { success: false, isPremium: false, error: 'Purchases not available' };
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
    if (!configured) return { success: false, isPremium: false, error: 'Purchases not available' };
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
    if (!configured) return false;
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return isPremiumFromCustomerInfo(customerInfo);
    } catch {
        return false;
    }
}

// ─── Backend sync ─────────────────────────────────────────────────────────────

/**
 * Call the backend verify endpoint after a successful purchase.
 * The backend confirms the entitlement with the RC REST API and updates isPremium.
 * Must be called before refreshUser() so the profile fetch returns the updated status.
 */
export async function verifyPremiumWithBackend(): Promise<void> {
    try {
        await api.post('/api/purchases/verify', {});
    } catch (e) {
        console.warn('[Purchases] verifyPremiumWithBackend failed:', e);
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPremiumFromCustomerInfo(info: CustomerInfo): boolean {
    return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}