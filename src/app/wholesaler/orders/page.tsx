'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Providers } from '../../providers';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDateTime, getOrderStatusColor } from '@/lib/format';
import { Check, Truck, X } from 'lucide-react';

interface Order {
  id: string;
  vendorId: string;
  status: string;
  totalCents: number;
  items: Array<{ productId: string; quantity: number; conditioning: string; unitPrice: number; totalCents: number }>;
  createdAt: string;
  vendor?: { businessName: string };
}

function WholesalerOrdersContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const data = await apiFetch('/api/wholesaler/orders');
      setOrders(data.orders || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user && user.role !== 'WHOLESALER') {
      router.replace('/');
      return;
    }
    if (user) loadOrders();
  }, [user, authLoading, router, loadOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await apiFetch('/api/wholesaler/orders', {
        method: 'PUT',
        body: JSON.stringify({ orderId, status }),
      });
      loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('nav.orders')}</h1>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>{t('common.noResults')}</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">{order.vendor?.businessName || 'Vendeur'}</p>
                    <p className="text-sm text-gray-400">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(order.totalCents)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
                      {t(`orders.${order.status.toLowerCase()}`)}
                    </span>
                  </div>
                </div>

                {/* Order items */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  {(order.items as Array<{ productId: string; quantity: number; conditioning: string; unitPrice: number; totalCents: number }>).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{item.quantity}x {item.conditioning}</span>
                      <span>{formatCurrency(item.totalCents)}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                {order.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(order.id, 'CONFIRMED')}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600"
                    >
                      <Check size={16} />
                      {t('orders.confirm')}
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, 'CANCELLED')}
                      className="flex items-center justify-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      <X size={16} />
                      {t('orders.cancel')}
                    </button>
                  </div>
                )}
                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => updateStatus(order.id, 'DELIVERED')}
                    className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600"
                  >
                    <Truck size={16} />
                    {t('orders.deliver')}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function WholesalerOrdersPage() {
  return (
    <Providers>
      <WholesalerOrdersContent />
    </Providers>
  );
}
