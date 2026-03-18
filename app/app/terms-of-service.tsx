/**
 * Terms of Service Screen
 * Terms and conditions display
 */

import React from 'react';
import { LegalScreen } from '@/components/ui/LegalScreen';
import { termsOfServiceText } from '@/constants/legalTexts';

export default function TermsOfServiceScreen() {
    return (
        <LegalScreen
            title={termsOfServiceText.title}
            lastUpdate={termsOfServiceText.lastUpdate}
            sections={termsOfServiceText.sections}
        />
    );
}
