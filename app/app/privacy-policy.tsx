/**
 * Privacy Policy Screen
 * GDPR compliant privacy policy display
 */

import React from 'react';
import { LegalScreen } from '@/components/ui/LegalScreen';
import { privacyPolicyText } from '@/constants/legalTexts';

export default function PrivacyPolicyScreen() {
    return (
        <LegalScreen
            title={privacyPolicyText.title}
            lastUpdate={privacyPolicyText.lastUpdate}
            sections={privacyPolicyText.sections}
        />
    );
}
