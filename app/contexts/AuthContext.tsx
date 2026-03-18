import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    User,
    LoginCredentials,
    RegisterData,
    login as authLogin,
    register as authRegister,
    logout as authLogout,
    deleteAccount as authDeleteAccount,
    getStoredUser,
    isAuthenticated as checkAuth,
    fetchProfile,
} from '@/services/auth';
import {
    loginWithGoogle as oauthLoginWithGoogle,
    loginWithApple as oauthLoginWithApple,
} from '@/services/oauth';
import { onSessionExpired } from '@/services/sessionManager';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    refreshUser: () => Promise<void>;
    loginWithGoogle: (idToken: string) => Promise<void>;
    loginWithApple: (idToken: string, userInfo?: { email?: string; fullName?: { givenName?: string; familyName?: string } }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        async function loadUser() {
            try {
                const authenticated = await checkAuth();
                if (authenticated) {
                    const storedUser = await getStoredUser();
                    setUser(storedUser);
                }
            } catch (error) {
                console.error('Error loading user:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadUser();
    }, []);

    // Listen for session expiry events (from API calls)
    useEffect(() => {
        const unsubscribe = onSessionExpired(() => {
            console.log('Session expired - logging out');
            setUser(null);
        });
        return unsubscribe;
    }, []);

    const login = useCallback(async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            const loggedInUser = await authLogin(credentials);
            setUser(loggedInUser);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(async (data: RegisterData) => {
        setIsLoading(true);
        try {
            // Register the user
            await authRegister(data);
            // Auto-login after registration
            const loggedInUser = await authLogin({
                email: data.email,
                password: data.password,
            });
            setUser(loggedInUser);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await authLogout();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const deleteAccount = useCallback(async () => {
        setIsLoading(true);
        try {
            await authDeleteAccount();
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            // Fetch fresh user data from the API
            const freshUser = await fetchProfile();
            // Update local storage
            await SecureStore.setItemAsync('astromatch_user', JSON.stringify(freshUser));
            // Update state
            setUser(freshUser);
        } catch (error: unknown) {
            console.error('Error refreshing user:', error);
            // Check if it's an auth error
            if (error instanceof Error &&
                (error.message.includes('401') ||
                 error.message.includes('expired') ||
                 error.message.includes('Not authenticated') ||
                 error.message.includes('Invalid JWT'))) {
                // Session expired - logout
                await authLogout();
                setUser(null);
            } else {
                // Other error - fallback to stored user
                const storedUser = await getStoredUser();
                setUser(storedUser);
            }
        }
    }, []);

    const loginWithGoogle = useCallback(async (idToken: string) => {
        setIsLoading(true);
        try {
            const loggedInUser = await oauthLoginWithGoogle(idToken);
            setUser(loggedInUser);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loginWithApple = useCallback(async (
        idToken: string,
        userInfo?: { email?: string; fullName?: { givenName?: string; familyName?: string } }
    ) => {
        setIsLoading(true);
        try {
            const loggedInUser = await oauthLoginWithApple(idToken, userInfo);
            setUser(loggedInUser);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        deleteAccount,
        refreshUser,
        loginWithGoogle,
        loginWithApple,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;