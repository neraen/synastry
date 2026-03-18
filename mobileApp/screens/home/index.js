import {useEffect, useState} from "react";
import {SafeAreaView, StyleSheet, Text} from "react-native";
import {colors} from "../../constants/colors";
import {fetchEphemeris} from "../../api/endpoints";
export default function HomeScreen() {
    const [status, setStatus] = useState({
        loading: true,
        ok: false,
        message: ""
    });

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const data = await fetchEphemeris();
                if (!active) return;
                setStatus({
                    loading: false,
                    ok: true,
                    message: data?.message || "Ephemeris OK"
                });
            } catch (error) {
                if (!active) return;
                setStatus({
                    loading: false,
                    ok: false,
                    message: error?.message || "API unreachable"
                });
            }
        };

        load();

        return () => {
            active = false;
        };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={[styles.status, status.ok ? styles.ok : styles.error]}>
                {status.loading ? "Connexion en cours..." : status.message}
            </Text>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.LIGHT,
        justifyContent: "center",
        alignItems: "center"
    },
    scrollViewContainer: {
        flexGrow: 1
    },
    status: {
        fontSize: 16
    },
    ok: {
        color: "green"
    },
    error: {
        color: "red"
    }
})
