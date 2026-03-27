'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Providers } from '../providers';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { UserPlus, Phone, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  debtBalance: number;
  preferredLanguage: string;
  createdAt: string;
  transactions?: Array<{
    id: string;
    totalCents: number;
    paymentStatus: string;
    createdAt: string;
  }>;
}

function ClientsContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    preferredLanguage: 'fr',
  });

  const loadClients = useCallback(async () => {
    try {
      const data = await apiFetch('/api/vendor/clients');
      setClients(data.clients || []);
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
    if (user) loadClients();
  }, [user, authLoading, router, loadClients]);

  const handleAddClient = async () => {
    try {
      await apiFetch('/api/vendor/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
      });
      setShowAdd(false);
      setNewClient({ name: '', phone: '', email: '', preferredLanguage: 'fr' });
      loadClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const sendSmsReminder = async (clientId: string) => {
    try {
      await apiFetch('/api/cron/trigger-sms', {
        method: 'POST',
        body: JSON.stringify({ clientId }),
      });
      alert('SMS envoyé');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error sending SMS');
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
          <h1 className="text-2xl font-bold text-gray-800">{t('clients.title')}</h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#10b981] text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600"
          >
            <UserPlus size={18} />
            {t('clients.addClient')}
          </button>
        </div>

        {/* Add client form */}
        {showAdd && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-semibold mb-3">{t('clients.addClient')}</h3>
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
              <input
                type="email"
                placeholder={t('clients.email')}
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
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
                <button onClick={handleAddClient} className="flex-1 bg-[#10b981] text-white py-3 rounded-lg font-medium">
                  {t('common.save')}
                </button>
                <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 py-3 rounded-lg">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client list */}
        <div className="space-y-3">
          {clients.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>{t('clients.noClients')}</p>
            </div>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{client.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {client.phone}
                        </span>
                        <span>{client.preferredLanguage.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`font-semibold ${client.debtBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatCurrency(client.debtBalance)}
                        </p>
                        <p className="text-xs text-gray-400">{t('clients.debt')}</p>
                      </div>
                      {expandedClient === client.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {expandedClient === client.id && (
                  <div className="border-t px-4 py-3 bg-gray-50">
                    <div className="flex gap-2 mb-3">
                      {client.debtBalance > 0 && (
                        <button
                          onClick={() => sendSmsReminder(client.id)}
                          className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200"
                        >
                          <MessageSquare size={14} />
                          {t('clients.sendSms')}
                        </button>
                      )}
                    </div>
                    {client.transactions && client.transactions.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-600">{t('clients.history')}</h4>
                        {client.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between text-sm py-1">
                            <span className="text-gray-500">{formatDateTime(tx.createdAt)}</span>
                            <span className="font-medium">{formatCurrency(tx.totalCents)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">{t('common.noResults')}</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function ClientsPage() {
  return (
    <Providers>
      <ClientsContent />
    </Providers>
  );
}
