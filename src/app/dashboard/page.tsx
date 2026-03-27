'use client';

import React, { useEffect, useState } from 'react';
import { Providers } from '../providers';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDateTime, getPaymentStatusColor } from '@/lib/format';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  DollarSign,
} from 'lucide-react';

interface DashboardData {
  salesToday: { count: number; totalCents: number };
  totalDebt: number;
  lowStockProducts: Array<{ id: string; productId: string; productType: string; price: number; stock: number; lowStockAlert: number }>;
  totalClients: number;
  recentTransactions: Array<{
    id: string;
    totalCents: number;
    paymentStatus: string;
    createdAt: string;
    client: { name: string };
  }>;
}

function DashboardContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user && user.role !== 'VENDOR') {
      router.replace('/');
      return;
    }
    if (user) {
      apiFetch('/api/vendor/dashboard')
        .then(setData)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, apiFetch, router]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">{t('common.error')}</p>
        </div>
      </Layout>
    );
  }

  const stats = [
    {
      label: t('dashboard.salesToday'),
      value: formatCurrency(data.salesToday.totalCents),
      sub: `${data.salesToday.count} ventes`,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: t('dashboard.totalDebt'),
      value: formatCurrency(data.totalDebt),
      icon: DollarSign,
      color: 'bg-red-500',
    },
    {
      label: t('dashboard.lowStock'),
      value: `${data.lowStockProducts.length}`,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
    },
    {
      label: t('dashboard.totalClients'),
      value: `${data.totalClients}`,
      icon: Users,
      color: 'bg-blue-500',
    },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('dashboard.title')}</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
              {stat.sub && <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Low stock alerts */}
      {data.lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} />
            {t('dashboard.alerts')}
          </h3>
          <div className="space-y-1">
            {data.lowStockProducts.map((p) => (
              <p key={p.id} className="text-sm text-yellow-700">
                Produit {p.productId.slice(0, 8)}... - Stock: {p.stock} (alerte: {p.lowStockAlert})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-4">{t('dashboard.recentTransactions')}</h3>
        {data.recentTransactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">{t('common.noResults')}</p>
        ) : (
          <div className="space-y-3">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{tx.client.name}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(tx.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(tx.totalCents)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(tx.paymentStatus)}`}>
                    {tx.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function DashboardPage() {
  return (
    <Providers>
      <DashboardContent />
    </Providers>
  );
}
