'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Providers } from '../providers';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDateTime } from '@/lib/format';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  BarChart3,
  Star,
  FileText,
  LogOut,
  TrendingUp,
  Download,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'users' | 'commissions' | 'data' | 'sponsoring' | 'logs';

interface AdminDashboard {
  totalUsers: number;
  totalVendors: number;
  totalWholesalers: number;
  totalCommissions: number;
  pendingCommissions: number;
  collectedCommissions: number;
  totalTransactions: number;
  sponsoredProducts: number;
  dataSubscriptions: number;
}

function AdminContent() {
  const { t } = useTranslation();
  const { user, loading: authLoading, logout } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string; role: string; createdAt: string; vendorProfile?: { businessName: string }; wholesalerProfile?: { businessName: string } }>>([]);
  const [commissions, setCommissions] = useState<Array<{ id: string; amountCents: number; status: string; createdAt: string; transaction: { id: string; totalCents: number } }>>([]);
  const [sponsoredProducts, setSponsoredProducts] = useState<Array<{ id: string; defaultProductId: string; startDate: string; endDate: string; active: boolean; defaultProduct: { nameFr: string } }>>([]);
  const [dataSubscriptions, setDataSubscriptions] = useState<Array<{ id: string; companyName: string; contactEmail: string; monthlyFee: number; active: boolean; startDate: string; endDate: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Sponsoring form
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [sponsorForm, setSponsorForm] = useState({ defaultProductId: '', startDate: '', endDate: '' });

  // Data subscription form
  const [showSubForm, setShowSubForm] = useState(false);
  const [subForm, setSubForm] = useState({ companyName: '', contactEmail: '', monthlyFee: 0, startDate: '', endDate: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
  }, [user, authLoading, router]);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/dashboard');
      setDashboardData(data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(data.users || []);
    } catch {
      // Handle error
    }
  }, [apiFetch]);

  const loadCommissions = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/commissions');
      setCommissions(data.commissions || []);
    } catch {
      // Handle error
    }
  }, [apiFetch]);

  const loadSponsoring = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/sponsoring');
      setSponsoredProducts(data.sponsoredProducts || []);
    } catch {
      // Handle error
    }
  }, [apiFetch]);

  const loadSubscriptions = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/data-subscriptions');
      setDataSubscriptions(data.subscriptions || []);
    } catch {
      // Handle error
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      switch (activeTab) {
        case 'dashboard': loadDashboard(); break;
        case 'users': loadUsers(); break;
        case 'commissions': loadCommissions(); break;
        case 'sponsoring': loadSponsoring(); break;
        case 'data': loadSubscriptions(); break;
      }
    }
  }, [activeTab, user, loadDashboard, loadUsers, loadCommissions, loadSponsoring, loadSubscriptions]);

  const generateInvoices = async () => {
    try {
      const data = await apiFetch('/api/cron/generate-invoices', { method: 'POST' });
      alert(`${data.invoicesCreated} factures générées`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const addSponsoring = async () => {
    try {
      await apiFetch('/api/admin/sponsoring', {
        method: 'POST',
        body: JSON.stringify(sponsorForm),
      });
      setShowSponsorForm(false);
      setSponsorForm({ defaultProductId: '', startDate: '', endDate: '' });
      loadSponsoring();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const removeSponsoring = async (id: string) => {
    try {
      await apiFetch(`/api/admin/sponsoring?id=${id}`, { method: 'DELETE' });
      loadSponsoring();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const addSubscription = async () => {
    try {
      await apiFetch('/api/admin/data-subscriptions', {
        method: 'POST',
        body: JSON.stringify({ ...subForm, monthlyFee: subForm.monthlyFee * 100 }),
      });
      setShowSubForm(false);
      setSubForm({ companyName: '', contactEmail: '', monthlyFee: 0, startDate: '', endDate: '' });
      loadSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const tabs = [
    { id: 'dashboard' as AdminTab, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'users' as AdminTab, label: t('admin.users'), icon: Users },
    { id: 'commissions' as AdminTab, label: t('admin.commissions'), icon: DollarSign },
    { id: 'data' as AdminTab, label: t('admin.dataInsights'), icon: BarChart3 },
    { id: 'sponsoring' as AdminTab, label: t('admin.sponsoring'), icon: Star },
    { id: 'logs' as AdminTab, label: t('admin.logs'), icon: FileText },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{t('admin.title')}</h1>
            <p className="text-blue-200 text-sm">{user?.email}</p>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-red-300 hover:text-white">
            <LogOut size={18} />
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* Tab navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dashboard tab */}
        {activeTab === 'dashboard' && dashboardData && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: t('admin.users'), value: dashboardData.totalUsers, icon: Users, color: 'bg-blue-500' },
                { label: t('admin.totalRevenue'), value: formatCurrency(dashboardData.totalCommissions), icon: TrendingUp, color: 'bg-green-500' },
                { label: t('admin.pendingCommissions'), value: formatCurrency(dashboardData.pendingCommissions), icon: DollarSign, color: 'bg-yellow-500' },
                { label: t('admin.collectedCommissions'), value: formatCurrency(dashboardData.collectedCommissions), icon: Check, color: 'bg-purple-500' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className={`${stat.color} p-2 rounded-lg w-fit mb-2`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Vendeurs</p>
                <p className="text-2xl font-bold">{dashboardData.totalVendors}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Grossistes</p>
                <p className="text-2xl font-bold">{dashboardData.totalWholesalers}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-2xl font-bold">{dashboardData.totalTransactions}</p>
              </div>
            </div>
            <button
              onClick={generateInvoices}
              className="mt-6 bg-[#8b5cf6] text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600"
            >
              {t('admin.generateInvoices')}
            </button>
          </div>
        )}

        {/* Users tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">{t('auth.email')}</th>
                  <th className="text-left p-3">{t('auth.role')}</th>
                  <th className="text-left p-3">{t('auth.businessName')}</th>
                  <th className="text-left p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'VENDOR' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">{u.vendorProfile?.businessName || u.wholesalerProfile?.businessName || '-'}</td>
                    <td className="p-3">{formatDateTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Commissions tab */}
        {activeTab === 'commissions' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Transaction</th>
                    <th className="text-left p-3">Montant</th>
                    <th className="text-left p-3">Commission</th>
                    <th className="text-left p-3">Statut</th>
                    <th className="text-left p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{c.transaction.id.slice(0, 12)}...</td>
                      <td className="p-3">{formatCurrency(c.transaction.totalCents)}</td>
                      <td className="p-3 font-medium">{formatCurrency(c.amountCents)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          c.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3">{formatDateTime(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Insights tab */}
        {activeTab === 'data' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('admin.subscriptions')}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSubForm(true)}
                  className="flex items-center gap-2 bg-[#10b981] text-white px-4 py-2 rounded-lg text-sm"
                >
                  <Plus size={16} />
                  Ajouter
                </button>
                <button className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm">
                  <Download size={16} />
                  {t('admin.exportCsv')}
                </button>
              </div>
            </div>

            {showSubForm && (
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Entreprise" value={subForm.companyName} onChange={(e) => setSubForm({ ...subForm, companyName: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <input type="email" placeholder="Email contact" value={subForm.contactEmail} onChange={(e) => setSubForm({ ...subForm, contactEmail: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <input type="number" placeholder="Frais mensuel (FCFA)" value={subForm.monthlyFee || ''} onChange={(e) => setSubForm({ ...subForm, monthlyFee: Number(e.target.value) })} className="px-4 py-2 border rounded-lg" />
                  <input type="date" value={subForm.startDate} onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <input type="date" value={subForm.endDate} onChange={(e) => setSubForm({ ...subForm, endDate: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  <div className="flex gap-2">
                    <button onClick={addSubscription} className="bg-[#10b981] text-white px-4 py-2 rounded-lg">{t('common.save')}</button>
                    <button onClick={() => setShowSubForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg">{t('common.cancel')}</button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Entreprise</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Frais/mois</th>
                    <th className="text-left p-3">Période</th>
                    <th className="text-left p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {dataSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-t">
                      <td className="p-3 font-medium">{sub.companyName}</td>
                      <td className="p-3">{sub.contactEmail}</td>
                      <td className="p-3">{formatCurrency(sub.monthlyFee)}</td>
                      <td className="p-3 text-xs">{formatDateTime(sub.startDate)} - {formatDateTime(sub.endDate)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${sub.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {sub.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sponsoring tab */}
        {activeTab === 'sponsoring' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('admin.sponsoring')}</h2>
              <button
                onClick={() => setShowSponsorForm(true)}
                className="flex items-center gap-2 bg-[#8b5cf6] text-white px-4 py-2 rounded-lg text-sm"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {showSponsorForm && (
              <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <div className="space-y-3">
                  <input type="text" placeholder="ID du produit (DefaultProduct)" value={sponsorForm.defaultProductId} onChange={(e) => setSponsorForm({ ...sponsorForm, defaultProductId: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={sponsorForm.startDate} onChange={(e) => setSponsorForm({ ...sponsorForm, startDate: e.target.value })} className="px-4 py-2 border rounded-lg" />
                    <input type="date" value={sponsorForm.endDate} onChange={(e) => setSponsorForm({ ...sponsorForm, endDate: e.target.value })} className="px-4 py-2 border rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSponsoring} className="bg-[#8b5cf6] text-white px-4 py-2 rounded-lg">{t('common.save')}</button>
                    <button onClick={() => setShowSponsorForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg">{t('common.cancel')}</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {sponsoredProducts.map((sp) => (
                <div key={sp.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sp.defaultProduct.nameFr}</p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(sp.startDate)} - {formatDateTime(sp.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${sp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {sp.active ? 'Actif' : 'Inactif'}
                    </span>
                    <button onClick={() => removeSponsoring(sp.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-gray-500 text-center py-8">
              Les logs de transactions sont disponibles via l&apos;API /api/admin/commissions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPortalPage() {
  return (
    <Providers>
      <AdminContent />
    </Providers>
  );
}
