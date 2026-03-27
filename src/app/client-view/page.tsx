'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, formatDateTime, getPaymentStatusColor } from '@/lib/format';

interface ClientData {
  client: {
    name: string;
    phone: string;
    debtBalance: number;
  };
  transactions: Array<{
    id: string;
    totalCents: number;
    paymentStatus: string;
    amountPaid: number;
    remaining: number;
    createdAt: string;
    items: Array<{ productId: string; quantity: number; unitPrice: number; totalCents: number }>;
  }>;
  vendorProducts: Array<{
    id: string;
    productId: string;
    price: number;
    stock: number;
  }>;
  vendor: {
    businessName: string;
    phone: string;
  };
}

function ClientViewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Lien invalide');
      setLoading(false);
      return;
    }

    fetch(`/api/client-portal?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Lien expiré ou invalide');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a8a]">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Bor-Bi</h1>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1e3a8a] mb-2">Bor-Bi</h1>
          <p className="text-red-500">{error || 'Erreur inconnue'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1e3a8a] text-white p-4">
        <h1 className="text-xl font-bold">Bor-Bi</h1>
        <p className="text-blue-200 text-sm">{data.vendor.businessName}</p>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {/* Client info */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="font-semibold text-lg mb-2">{data.client.name}</h2>
          <p className="text-sm text-gray-500">{data.client.phone}</p>
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Solde actuel</p>
            <p className={`text-2xl font-bold ${data.client.debtBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {formatCurrency(data.client.debtBalance)}
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-3">Historique des transactions</h3>
          {data.transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Aucune transaction</p>
          ) : (
            <div className="space-y-3">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-400">{formatDateTime(tx.createdAt)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(tx.paymentStatus)}`}>
                      {tx.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total: {formatCurrency(tx.totalCents)}</span>
                    <span className="text-sm text-gray-500">Payé: {formatCurrency(tx.amountPaid)}</span>
                  </div>
                  {tx.remaining > 0 && (
                    <p className="text-sm text-red-500">Reste: {formatCurrency(tx.remaining)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vendor contact */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold mb-2">Contacter le vendeur</h3>
          <a
            href={`sms:${data.vendor.phone}`}
            className="block w-full bg-[#10b981] text-white text-center py-3 rounded-lg font-medium"
          >
            Envoyer un SMS à {data.vendor.businessName}
          </a>
        </div>

        {/* Vendor products */}
        {data.vendorProducts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold mb-3">Catalogue du vendeur</h3>
            <div className="space-y-2">
              {data.vendorProducts.slice(0, 20).map((p) => (
                <div key={p.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                  <span className="text-gray-600">{p.productId.slice(0, 16)}...</span>
                  <span className="font-medium">{formatCurrency(p.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a8a]">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Bor-Bi</h1>
          <p>Chargement...</p>
        </div>
      </div>
    }>
      <ClientViewContent />
    </Suspense>
  );
}
