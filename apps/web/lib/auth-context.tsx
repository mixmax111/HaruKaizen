'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setAccessToken } from '../lib/api';
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
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
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
    // Tenta refresh all'avvio
    apiClient
      .post('/auth/refresh')
      .then((res) => {
        const token = res.data.data?.accessToken || res.data.accessToken;
        setAccessToken(token);
        return fetchProfile();
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (token: string) => {
    setAccessToken(token);
    await fetchProfile();
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
