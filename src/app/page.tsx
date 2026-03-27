'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Providers } from './providers';
import { useAuth } from '@/contexts/AuthContext';

function HomeRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'ADMIN') {
        router.replace('/admin-portal');
      } else if (user.role === 'WHOLESALER') {
        router.replace('/wholesaler/dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a8a]">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-2">Bor-Bi</h1>
        <p className="text-blue-200">par TransTech Solution</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <HomeRedirect />
    </Providers>
  );
}
