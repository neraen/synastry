import { useState, useCallback } from 'react';
import { login as apiLogin } from '../api/auth';
import { setToken, clearToken, getToken } from '../api/client';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getToken());

  const login = useCallback(async (email: string, password: string) => {
    const token = await apiLogin(email, password);
    setToken(token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
