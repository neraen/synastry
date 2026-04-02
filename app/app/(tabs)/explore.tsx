import React from 'react';
import {
    Screen,
    AppHeading,
    AppText,
    Spacer,
    EmptyState,
} from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';

export default function Explore() {
    const { t } = useTranslation();
    return (
        <Screen variant="static" backgroundColor={colors.surfaceLowest}>
            <EmptyState
                title={t('explore.comingSoon')}
                description={t('explore.description')}
            />
        </Screen>
    );
}