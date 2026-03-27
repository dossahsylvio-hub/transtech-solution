'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Providers } from '../providers';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

function RegisterForm() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'VENDOR' as 'VENDOR' | 'WHOLESALER',
    businessName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        role: form.role,
        businessName: form.businessName,
        phone: form.phone,
      });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-[#1e3a8a] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a8a]">Bor-Bi</h1>
          <p className="text-gray-500 text-sm">{t('app.subtitle')}</p>
        </div>

        <h2 className="text-xl font-semibold mb-6">{t('auth.register')}</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.role')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('role', 'VENDOR')}
                className={`py-3 rounded-lg text-sm font-medium transition-colors ${
                  form.role === 'VENDOR'
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('auth.vendor')}
              </button>
              <button
                type="button"
                onClick={() => updateField('role', 'WHOLESALER')}
                className={`py-3 rounded-lg text-sm font-medium transition-colors ${
                  form.role === 'WHOLESALER'
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('auth.wholesaler')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.businessName')}
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.phone')}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="+221..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.confirmPassword')}
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#10b981] text-white py-3 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition-colors text-base"
          >
            {loading ? t('common.loading') : t('auth.registerBtn')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="text-[#1e3a8a] font-medium hover:underline">
            {t('auth.loginBtn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Providers>
      <RegisterForm />
    </Providers>
  );
}
