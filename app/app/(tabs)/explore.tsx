import React from 'react';
import {
    Screen,
    AppHeading,
    AppText,
    Spacer,
    EmptyState,
} from '@/components/ui';

import { colors } from '@/theme';

export default function Explore() {
    return (
        <Screen variant="static" backgroundColor={colors.surfaceLowest}>
            <EmptyState
                title="Bientôt disponible"
                description="Explorez de nouvelles fonctionnalités astrologiques dans une prochaine version."
            />
        </Screen>
    );
}
