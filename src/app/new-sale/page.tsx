'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Providers } from '../providers';
import Layout from '@/components/Layout';
import VoiceButton from '@/components/VoiceButton';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';
import { Plus, Minus, Trash2, Search, UserPlus } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  debtBalance: number;
}

interface Product {
  id: string;
  productId: string;
  productType: string;
  price: number;
  stock: number;
}

interface CartItem {
  productId: string;
  productType: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalCents: number;
  maxStock: number;
}

function NewSaleContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', preferredLanguage: 'fr' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [clientsData, productsData] = await Promise.all([
        apiFetch('/api/vendor/clients'),
        apiFetch('/api/vendor/products'),
      ]);
      setClients(clientsData.clients || []);
      setProducts(productsData.products || []);
    } catch {
      // Handle error silently
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) loadData();
  }, [user, authLoading, router, loadData]);

  const subtotal = cart.reduce((sum, item) => sum + item.totalCents, 0);
  const remaining = Math.max(0, subtotal - amountPaid * 100);

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product.productId);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.productId === product.productId
              ? { ...item, quantity: item.quantity + 1, totalCents: (item.quantity + 1) * item.unitPrice }
              : item
          )
        );
      }
    } else {
      setCart([
        ...cart,
        {
          productId: product.productId,
          productType: product.productType,
          name: product.productId.slice(0, 12),
          quantity: 1,
          unitPrice: product.price,
          totalCents: product.price,
          maxStock: product.stock,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxStock) return item;
            return { ...item, quantity: newQty, totalCents: newQty * item.unitPrice };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const createClient = async () => {
    try {
      const data = await apiFetch('/api/vendor/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
      });
      setClients([...clients, data.client]);
      setSelectedClient(data.client);
      setShowNewClient(false);
      setNewClient({ name: '', phone: '', preferredLanguage: 'fr' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating client');
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient || cart.length === 0) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/vendor/transactions', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedClient.id,
          items: cart.map((item) => ({
            productId: item.productId,
            productType: item.productType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalCents: item.totalCents,
          })),
          amountPaid: amountPaid * 100,
        }),
      });
      setSuccess(true);
      setCart([]);
      setAmountPaid(0);
      setSelectedClient(null);
      loadData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceResult = (result: { products: Array<{ matchedProduct?: { id: string; name: string; price: number }; quantity: number; name: string }>; clientName?: string }) => {
    // Match client
    if (result.clientName) {
      const matched = clients.find((c) =>
        c.name.toLowerCase().includes(result.clientName!.toLowerCase())
      );
      if (matched) setSelectedClient(matched);
    }

    // Add products to cart
    for (const p of result.products) {
      if (p.matchedProduct) {
        const product = products.find((prod) => prod.productId === p.matchedProduct!.id);
        if (product) {
          const existing = cart.find((item) => item.productId === product.productId);
          if (!existing) {
            setCart((prev) => [
              ...prev,
              {
                productId: product.productId,
                productType: product.productType,
                name: p.name,
                quantity: p.quantity,
                unitPrice: product.price,
                totalCents: p.quantity * product.price,
                maxStock: product.stock,
              },
            ]);
          }
        }
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    searchQuery.length >= 2
      ? p.productId.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  if (authLoading) {
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
          <h1 className="text-2xl font-bold text-gray-800">{t('sale.title')}</h1>
          <VoiceButton onResult={handleVoiceResult} mode="sale" />
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {t('sale.success')}
          </div>
        )}

        {/* Client selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-3">{t('sale.selectClient')}</h3>
          {selectedClient ? (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div>
                <p className="font-medium">{selectedClient.name}</p>
                <p className="text-sm text-gray-500">{selectedClient.phone}</p>
                <p className="text-sm text-red-500">
                  {t('sale.currentDebt')}: {formatCurrency(selectedClient.debtBalance)}
                </p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
                >
                  <span className="font-medium">{client.name}</span>
                  <span className="text-sm text-gray-400 ml-2">{client.phone}</span>
                  {client.debtBalance > 0 && (
                    <span className="text-sm text-red-500 ml-2">
                      {formatCurrency(client.debtBalance)}
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={() => setShowNewClient(true)}
                className="w-full flex items-center gap-2 justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500"
              >
                <UserPlus size={18} />
                {t('sale.createClient')}
              </button>
            </div>
          )}
        </div>

        {/* New client form */}
        {showNewClient && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-semibold mb-3">{t('sale.createClient')}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('clients.name')}
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg"
              />
              <input
                type="tel"
                placeholder={t('clients.phone')}
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg"
              />
              <select
                value={newClient.preferredLanguage}
                onChange={(e) => setNewClient({ ...newClient, preferredLanguage: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg"
              >
                <option value="fr">Français</option>
                <option value="wo">Wolof</option>
                <option value="ar">العربية</option>
              </select>
              <div className="flex gap-2">
                <button onClick={createClient} className="flex-1 bg-[#10b981] text-white py-3 rounded-lg font-medium">
                  {t('common.save')}
                </button>
                <button onClick={() => setShowNewClient(false)} className="flex-1 bg-gray-100 py-3 rounded-lg">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product search and selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-3">{t('sale.searchProducts')}</h3>
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={t('sale.searchProducts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredProducts.slice(0, 20).map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg text-sm"
              >
                <span>{product.productId.slice(0, 16)}...</span>
                <span className="text-gray-500">
                  {formatCurrency(product.price)} | Stock: {product.stock}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-semibold mb-3">Panier</h3>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.unitPrice)} / unité</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 bg-gray-100 rounded">
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 bg-gray-100 rounded">
                      <Plus size={16} />
                    </button>
                    <button onClick={() => removeFromCart(item.productId)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="w-24 text-right font-semibold">{formatCurrency(item.totalCents)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between mb-2">
                <span className="font-medium">{t('sale.subtotal')}</span>
                <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">{t('sale.amountPaid')} (FCFA)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full px-4 py-3 border rounded-lg text-lg"
                  min={0}
                />
              </div>
              <div className="flex justify-between mb-4">
                <span className="font-medium">{t('sale.remaining')}</span>
                <span className={`font-bold text-lg ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!selectedClient || submitting}
                className="w-full bg-[#10b981] text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? t('common.loading') : t('sale.validate')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function NewSalePage() {
  return (
    <Providers>
      <NewSaleContent />
    </Providers>
  );
}
