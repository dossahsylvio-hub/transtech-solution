'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Providers } from '../../providers';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/format';
import { Plus, Search, Edit3, Trash2, Package } from 'lucide-react';

interface WholesalerProduct {
  id: string;
  productId: string;
  productType: string;
  price: number;
  conditioning: string;
  stock: number;
}

function CatalogContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [products, setProducts] = useState<WholesalerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog');
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: string; nameFr: string; category: string; unit: string; defaultPrice: number }>>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<WholesalerProduct | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, stock: 0, conditioning: '' });
  const [customProduct, setCustomProduct] = useState({ name: '', nameWolof: '', unit: 'unité', price: 0, stock: 0, conditioning: 'unité' });

  const loadProducts = useCallback(async () => {
    try {
      const data = await apiFetch('/api/wholesaler/products');
      setProducts(data.products || []);
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
    if (user) loadProducts();
  }, [user, authLoading, router, loadProducts]);

  const loadCatalog = async () => {
    try {
      const data = await apiFetch(`/api/products?search=${catalogSearch}`);
      setCatalogProducts(data.products || []);
    } catch {
      // Handle error
    }
  };

  useEffect(() => {
    if (showAdd && addMode === 'catalog') {
      loadCatalog();
    }
  }, [showAdd, addMode, catalogSearch]);

  const addFromCatalog = async (product: { id: string; defaultPrice: number }) => {
    try {
      await apiFetch('/api/wholesaler/products', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          productType: 'DefaultProduct',
          price: product.defaultPrice,
          conditioning: 'unité',
          stock: 0,
        }),
      });
      setShowAdd(false);
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const addCustom = async () => {
    try {
      await apiFetch('/api/wholesaler/products', {
        method: 'POST',
        body: JSON.stringify({
          productType: 'CustomProduct',
          customProduct: {
            name: customProduct.name,
            nameWolof: customProduct.nameWolof,
            unit: customProduct.unit,
            price: customProduct.price * 100,
            stock: customProduct.stock,
          },
          price: customProduct.price * 100,
          conditioning: customProduct.conditioning,
          stock: customProduct.stock,
        }),
      });
      setShowAdd(false);
      setCustomProduct({ name: '', nameWolof: '', unit: 'unité', price: 0, stock: 0, conditioning: 'unité' });
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;
    try {
      await apiFetch('/api/wholesaler/products', {
        method: 'PUT',
        body: JSON.stringify({
          id: editingProduct.id,
          price: editForm.price * 100,
          stock: editForm.stock,
          conditioning: editForm.conditioning,
        }),
      });
      setEditingProduct(null);
      loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const removeProduct = async (id: string) => {
    if (!confirm('Retirer ce produit ?')) return;
    try {
      await apiFetch(`/api/wholesaler/products?id=${id}`, { method: 'DELETE' });
      loadProducts();
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('nav.catalog')}</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#10b981] text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600"
          >
            <Plus size={18} />
            {t('stock.addProduct')}
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={t('stock.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border rounded-lg"
          />
        </div>

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <Package size={20} className="text-[#8b5cf6]" />
                  </div>
                  <div>
                    <p className="font-medium">{product.productId.slice(0, 16)}...</p>
                    <p className="text-sm text-gray-500">{product.conditioning} | Stock: {product.stock}</p>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(product.price)}</p>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setEditForm({ price: product.price / 100, stock: product.stock, conditioning: product.conditioning });
                  }}
                  className="flex items-center gap-1 text-sm text-blue-600"
                >
                  <Edit3 size={14} /> {t('stock.edit')}
                </button>
                <button
                  onClick={() => removeProduct(product.id)}
                  className="flex items-center gap-1 text-sm text-red-500"
                >
                  <Trash2 size={14} /> {t('stock.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-semibold text-lg mb-4">{t('stock.edit')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('stock.price')} (FCFA)</label>
                  <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} className="w-full px-4 py-3 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('stock.currentStock')}</label>
                  <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })} className="w-full px-4 py-3 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('orders.conditioning')}</label>
                  <input type="text" value={editForm.conditioning} onChange={(e) => setEditForm({ ...editForm, conditioning: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
                </div>
                <div className="flex gap-2">
                  <button onClick={updateProduct} className="flex-1 bg-[#10b981] text-white py-3 rounded-lg font-medium">{t('common.save')}</button>
                  <button onClick={() => setEditingProduct(null)} className="flex-1 bg-gray-100 py-3 rounded-lg">{t('common.cancel')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{t('stock.addProduct')}</h3>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">&times;</button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button onClick={() => setAddMode('catalog')} className={`py-2 rounded-lg text-sm font-medium ${addMode === 'catalog' ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100'}`}>
                  {t('stock.fromCatalog')}
                </button>
                <button onClick={() => setAddMode('custom')} className={`py-2 rounded-lg text-sm font-medium ${addMode === 'custom' ? 'bg-[#1e3a8a] text-white' : 'bg-gray-100'}`}>
                  {t('stock.customProduct')}
                </button>
              </div>

              {addMode === 'catalog' ? (
                <div>
                  <div className="relative mb-3">
                    <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                    <input type="text" placeholder={t('stock.search')} value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-lg" />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {catalogProducts.map((p) => (
                      <button key={p.id} onClick={() => addFromCatalog(p)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border text-left">
                        <div>
                          <span className="font-medium text-sm">{p.nameFr}</span>
                          <p className="text-xs text-gray-400">{p.category} | {p.unit}</p>
                        </div>
                        <span className="text-sm">{formatCurrency(p.defaultPrice)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input type="text" placeholder={t('stock.productName')} value={customProduct.name} onChange={(e) => setCustomProduct({ ...customProduct, name: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
                  <input type="text" placeholder={t('stock.productNameWolof')} value={customProduct.nameWolof} onChange={(e) => setCustomProduct({ ...customProduct, nameWolof: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
                  <input type="text" placeholder={t('orders.conditioning')} value={customProduct.conditioning} onChange={(e) => setCustomProduct({ ...customProduct, conditioning: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
                  <select value={customProduct.unit} onChange={(e) => setCustomProduct({ ...customProduct, unit: e.target.value })} className="w-full px-4 py-3 border rounded-lg">
                    <option value="unité">Unité</option>
                    <option value="kg">Kg</option>
                    <option value="litre">Litre</option>
                    <option value="carton">Carton</option>
                    <option value="sac">Sac</option>
                  </select>
                  <input type="number" placeholder={`${t('stock.price')} (FCFA)`} value={customProduct.price || ''} onChange={(e) => setCustomProduct({ ...customProduct, price: Number(e.target.value) })} className="w-full px-4 py-3 border rounded-lg" />
                  <input type="number" placeholder={t('stock.currentStock')} value={customProduct.stock || ''} onChange={(e) => setCustomProduct({ ...customProduct, stock: Number(e.target.value) })} className="w-full px-4 py-3 border rounded-lg" />
                  <button onClick={addCustom} className="w-full bg-[#10b981] text-white py-3 rounded-lg font-medium">{t('common.save')}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function WholesalerCatalogPage() {
  return (
    <Providers>
      <CatalogContent />
    </Providers>
  );
}
