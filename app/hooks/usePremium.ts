import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns premium status from the authenticated user profile.
 * The backend verifies RevenueCat server-side on each /api/me call.
 */
export function usePremium() {
    const { user } = useAuth();
    const isPremium = user?.isPremium ?? false;
    return { isPremium };
}