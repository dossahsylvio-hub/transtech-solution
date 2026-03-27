'use client';

import React, { useEffect, useState } from 'react';
import { Providers } from '../../providers';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';
import { ClipboardList, AlertTriangle, TrendingUp, Package } from 'lucide-react';

interface WholesalerDashboardData {
  pendingOrders: number;
  confirmedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  lowStockProducts: Array<{ id: string; productId: string; stock: number }>;
  recentOrders: Array<{
    id: string;
    status: string;
    totalCents: number;
    createdAt: string;
  }>;
}

function WholesalerDashboardContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [data, setData] = useState<WholesalerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user && user.role !== 'WHOLESALER') {
      router.replace('/');
      return;
    }
    if (user) {
      apiFetch('/api/wholesaler/dashboard')
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
    { label: t('dashboard.pendingOrders'), value: data.pendingOrders, icon: ClipboardList, color: 'bg-yellow-500' },
    { label: t('dashboard.confirmedOrders'), value: data.confirmedOrders, icon: Package, color: 'bg-blue-500' },
    { label: t('dashboard.deliveredOrders'), value: data.deliveredOrders, icon: TrendingUp, color: 'bg-green-500' },
    { label: t('dashboard.totalRevenue'), value: formatCurrency(data.totalRevenue), icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className={`${stat.color} p-2 rounded-lg w-fit mb-2`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {data.lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} />
            {t('dashboard.lowStock')} ({data.lowStockProducts.length})
          </h3>
          {data.lowStockProducts.map((p) => (
            <p key={p.id} className="text-sm text-yellow-700">
              {p.productId.slice(0, 16)}... - Stock: {p.stock}
            </p>
          ))}
        </div>
      )}
    </Layout>
  );
}

export default function WholesalerDashboardPage() {
  return (
    <Providers>
      <WholesalerDashboardContent />
    </Providers>
  );
}
