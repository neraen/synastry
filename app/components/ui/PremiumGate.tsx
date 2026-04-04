import React from 'react';
import { usePremium } from '@/hooks/usePremium';

interface PremiumGateProps {
    children: React.ReactNode;
    /** Rendered instead of children when user is not premium */
    fallback?: React.ReactNode;
}

/**
 * Renders children if user is premium, fallback otherwise.
 * If no fallback is provided and user is not premium, renders nothing.
 */
export function PremiumGate({ children, fallback }: PremiumGateProps) {
    const { isPremium } = usePremium();

    if (isPremium) return <>{children}</>;
    if (fallback) return <>{fallback}</>;
    return null;
}