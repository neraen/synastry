import React, { Component, ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Une erreur est survenue</Text>
                    <ScrollView style={styles.scroll}>
                        <Text style={styles.message}>{this.state.error?.message}</Text>
                        <Text style={styles.stack}>{this.state.error?.stack}</Text>
                    </ScrollView>
                    <Pressable style={styles.button} onPress={() => this.setState({ hasError: false, error: null })}>
                        <Text style={styles.buttonText}>Réessayer</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A1A', padding: 24, paddingTop: 60 },
    title: { color: '#ff6b6b', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    scroll: { flex: 1 },
    message: { color: '#fff', fontSize: 14, marginBottom: 12 },
    stack: { color: '#aaa', fontSize: 11, fontFamily: 'monospace' },
    button: { backgroundColor: '#333', padding: 16, borderRadius: 12, marginTop: 16, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold' },
});