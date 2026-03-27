'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useApi() {
  const { token } = useAuth();

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [token]
  );

  return { apiFetch };
}

export function useApiCall<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (fetcher: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute, setData };
}
