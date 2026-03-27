'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'VENDOR' | 'WHOLESALER';
  vendorProfile?: {
    id: string;
    businessName: string;
    phone: string;
  };
  wholesalerProfile?: {
    id: string;
    businessName: string;
    phone: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  role: 'VENDOR' | 'WHOLESALER';
  businessName: string;
  phone: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('borbi_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // offline mode - keep token
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('borbi_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('borbi_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (data: RegisterData) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Registration failed');
    }
    const resData = await res.json();
    localStorage.setItem('borbi_token', resData.token);
    setToken(resData.token);
    setUser(resData.user);
  };

  const logout = () => {
    localStorage.removeItem('borbi_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
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
