import React from 'react';
import {
    Screen,
    AppHeading,
    AppText,
    Spacer,
    EmptyState,
} from '@/components/ui';

const BG = require('@/assets/images/interface/background-starry.png');

export default function Explore() {
    return (
        <Screen variant="static" backgroundImage={BG}>
            <EmptyState
                title="Bientôt disponible"
                description="Explorez de nouvelles fonctionnalités astrologiques dans une prochaine version."
            />
        </Screen>
    );
}
