'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import Cookies from 'js-cookie';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      const token = Cookies.get('accessToken');
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await apiClient('/api/auth/me');
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    loadUser();
    return () => { cancelled = true; };
  }, []);

  // Protect routes
  useEffect(() => {
    if (!loading) {
      const isAuthRoute = pathname === '/login' || pathname === '/register';
      if (!user && !isAuthRoute) {
        router.push('/login');
      } else if (user && isAuthRoute) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  const login = (tokens: { accessToken: string; refreshToken: string }, userData: User) => {
    Cookies.set('accessToken', tokens.accessToken);
    Cookies.set('refreshToken', tokens.refreshToken);
    setUser(userData);
    router.push('/');
  };

  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
