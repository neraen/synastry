/**
 * Legal Notice Screen
 * Legal information and credits
 */

import React from 'react';
import { LegalScreen } from '@/components/ui/LegalScreen';
import { legalNoticeText } from '@/constants/legalTexts';

export default function LegalNoticeScreen() {
    return (
        <LegalScreen
            title={legalNoticeText.title}
            lastUpdate={legalNoticeText.lastUpdate}
            sections={legalNoticeText.sections}
        />
    );
}
