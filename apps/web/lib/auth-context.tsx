'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { apiClient, setAccessToken, getApiBaseUrl } from '../lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
  heightCm?: number;
  birthDate?: string;
  sex?: string;
  lifestyleMultiplier?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, redirect?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/users/me');
      setUser(res.data.data || res.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Tenta refresh all'avvio con axios crudo per non attivare gli interceptor di apiClient
    const apiBase = getApiBaseUrl();
    axios
      .post(`${apiBase}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data?.data?.accessToken || res.data?.accessToken;
        if (token) {
          setAccessToken(token);
          return fetchProfile();
        } else {
          setUser(null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        // Normale quando l'utente è un visitatore anonimo o non ha una sessione attiva
        setAccessToken(null);
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  const login = async (token: string, redirect: boolean = true) => {
    setAccessToken(token);
    await fetchProfile();
    if (redirect) {
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignora errori di rete su logout
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
