import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Screen, AppHeading, AppText, Spacer } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function ModalScreen() {
    return (
        <Screen variant="static" backgroundColor={colors.background.secondary}>
            <Spacer size="3xl" />
            <AppHeading variant="h2" align="center">
                Modal
            </AppHeading>
            <Spacer size="lg" />
            <Link href="/" dismissTo style={styles.link}>
                <AppText variant="bodyMedium" color="accent">
                    Retour à l'accueil
                </AppText>
            </Link>
        </Screen>
    );
}

const styles = StyleSheet.create({
    link: {
        alignSelf: 'center',
        paddingVertical: spacing.lg,
    },
});
