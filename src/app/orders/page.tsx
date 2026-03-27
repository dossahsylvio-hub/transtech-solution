'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Providers } from '../providers';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDateTime, getOrderStatusColor } from '@/lib/format';
import { Truck, Plus, Star, Search } from 'lucide-react';

interface Wholesaler {
  id: string;
  businessName: string;
  phone: string;
  featured?: boolean;
}

interface WholesalerProduct {
  id: string;
  productId: string;
  productType: string;
  price: number;
  conditioning: string;
  stock: number;
}

interface Order {
  id: string;
  wholesalerId: string;
  status: string;
  totalCents: number;
  items: Array<{ productId: string; quantity: number; conditioning: string; unitPrice: number; totalCents: number }>;
  createdAt: string;
  wholesaler: { businessName: string };
}

interface OrderItem {
  productId: string;
  productType: string;
  quantity: number;
  conditioning: string;
  unitPrice: number;
  totalCents: number;
}

function OrdersContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [selectedWholesaler, setSelectedWholesaler] = useState<Wholesaler | null>(null);
  const [wholesalerProducts, setWholesalerProducts] = useState<WholesalerProduct[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      const data = await apiFetch('/api/orders');
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
    if (user) loadOrders();
  }, [user, authLoading, router, loadOrders]);

  const loadWholesalers = async () => {
    try {
      const data = await apiFetch('/api/admin/users?role=WHOLESALER');
      setWholesalers(data.users || []);
    } catch {
      // Fallback
    }
  };

  const selectWholesaler = async (w: Wholesaler) => {
    setSelectedWholesaler(w);
    try {
      const data = await apiFetch(`/api/wholesaler/products?wholesalerId=${w.id}`);
      setWholesalerProducts(data.products || []);
    } catch {
      setWholesalerProducts([]);
    }
  };

  const addItemToOrder = (product: WholesalerProduct) => {
    const existing = orderItems.find((item) => item.productId === product.productId);
    if (existing) {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === product.productId
            ? { ...item, quantity: item.quantity + 1, totalCents: (item.quantity + 1) * item.unitPrice }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: product.productId,
          productType: product.productType,
          quantity: 1,
          conditioning: product.conditioning,
          unitPrice: product.price,
          totalCents: product.price,
        },
      ]);
    }
  };

  const submitOrder = async () => {
    if (!selectedWholesaler || orderItems.length === 0) return;
    try {
      await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          wholesalerId: selectedWholesaler.id,
          items: orderItems,
        }),
      });
      setShowNewOrder(false);
      setOrderItems([]);
      setSelectedWholesaler(null);
      loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating order');
    }
  };

  const orderTotal = orderItems.reduce((sum, item) => sum + item.totalCents, 0);

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('orders.title')}</h1>
          <button
            onClick={() => {
              setShowNewOrder(true);
              loadWholesalers();
            }}
            className="flex items-center gap-2 bg-[#10b981] text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600"
          >
            <Plus size={18} />
            {t('orders.placeOrder')}
          </button>
        </div>

        {/* New order modal */}
        {showNewOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{t('orders.placeOrder')}</h3>
                <button onClick={() => setShowNewOrder(false)} className="text-gray-400 text-xl">&times;</button>
              </div>

              {!selectedWholesaler ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3">{t('orders.selectWholesaler')}</h4>
                  <div className="space-y-2">
                    {wholesalers.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => selectWholesaler(w)}
                        className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div>
                          <span className="font-medium">{w.businessName}</span>
                          <p className="text-sm text-gray-400">{w.phone}</p>
                        </div>
                        {w.featured && (
                          <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            <Star size={10} />
                            {t('orders.featured')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="font-medium">{selectedWholesaler.businessName}</p>
                    <button onClick={() => setSelectedWholesaler(null)} className="text-sm text-blue-600">
                      Changer
                    </button>
                  </div>

                  <div className="relative mb-3">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('common.search')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                    {wholesalerProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addItemToOrder(p)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg text-sm border"
                      >
                        <div>
                          <span>{p.productId.slice(0, 12)}...</span>
                          <p className="text-xs text-gray-400">{p.conditioning}</p>
                        </div>
                        <span>{formatCurrency(p.price)}</span>
                      </button>
                    ))}
                  </div>

                  {orderItems.length > 0 && (
                    <div className="border-t pt-3">
                      {orderItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <span>{item.quantity}x {item.conditioning}</span>
                          <span>{formatCurrency(item.totalCents)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                        <span>Total</span>
                        <span>{formatCurrency(orderTotal)}</span>
                      </div>
                      <button
                        onClick={submitOrder}
                        className="w-full bg-[#10b981] text-white py-3 rounded-lg font-medium mt-3"
                      >
                        {t('orders.placeOrder')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Existing orders */}
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Truck size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t('common.noResults')}</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{order.wholesaler.businessName}</p>
                    <p className="text-sm text-gray-400">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getOrderStatusColor(order.status)}`}>
                      {t(`orders.${order.status.toLowerCase()}`)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function OrdersPage() {
  return (
    <Providers>
      <OrdersContent />
    </Providers>
  );
}
