import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { Starfield } from '@/components/ui';
import { ShareCardPageV2 } from '@/components/compatibility-v2/ShareCardV2';
import { getCompatibilityV2Data } from '@/components/compatibility-v2/store';
import { MOCK_COMPAT_V2 } from '@/components/compatibility-v2/mockData';

export default function ShareCardV2Screen() {
    const data = getCompatibilityV2Data() ?? MOCK_COMPAT_V2;

    return (
        <View style={styles.screen}>
            <Starfield />
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <ShareCardPageV2 data={data} />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    safeArea: {
        flex: 1,
    },
});
