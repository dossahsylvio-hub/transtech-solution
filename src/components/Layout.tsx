'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  LogOut,
  Menu,
  X,
  Globe,
  ClipboardList,
} from 'lucide-react';

const languages = [
  { code: 'fr', label: 'Français' },
  { code: 'wo', label: 'Wolof' },
  { code: 'ar', label: 'العربية' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = lang;
    }
  };

  const vendorLinks = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/new-sale', label: t('nav.newSale'), icon: ShoppingCart },
    { href: '/stock', label: t('nav.stock'), icon: Package },
    { href: '/clients', label: t('nav.clients'), icon: Users },
    { href: '/orders', label: t('nav.wholesalerOrders'), icon: Truck },
  ];

  const wholesalerLinks = [
    { href: '/wholesaler/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/wholesaler/catalog', label: t('nav.catalog'), icon: Package },
    { href: '/wholesaler/orders', label: t('nav.orders'), icon: ClipboardList },
  ];

  const links = user?.role === 'WHOLESALER' ? wholesalerLinks : vendorLinks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="bg-[#1e3a8a] text-white p-4 flex items-center justify-between lg:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg font-bold">Bor-Bi</h1>
        <div className="flex items-center gap-2">
          <Globe size={18} />
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-transparent text-white text-sm border-none outline-none"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="text-black">
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-[#1e3a8a] text-white transform transition-transform duration-200
            lg:static lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="p-6 hidden lg:block">
            <h1 className="text-2xl font-bold">Bor-Bi</h1>
            <p className="text-blue-200 text-sm">{t('app.subtitle')}</p>
          </div>

          {/* Desktop language selector */}
          <div className="hidden lg:flex items-center gap-2 px-6 pb-4">
            <Globe size={16} />
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-blue-800 text-white text-sm border-none outline-none rounded px-2 py-1"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <nav className="mt-4 lg:mt-0">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-6 py-3 text-sm transition-colors
                    ${isActive ? 'bg-blue-700 border-r-4 border-[#10b981]' : 'hover:bg-blue-800'}
                  `}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                logout();
                setSidebarOpen(false);
              }}
              className="flex items-center gap-3 px-6 py-3 text-sm text-red-300 hover:bg-red-900 hover:text-white w-full mt-4"
            >
              <LogOut size={20} />
              <span>{t('nav.logout')}</span>
            </button>
          </nav>

          {/* Loan CTA */}
          <div className="absolute bottom-4 left-4 right-4">
            <a
              href="/api/affiliate?redirect=true"
              className="block bg-[#8b5cf6] text-white text-center py-3 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              {t('common.loanCta')}
            </a>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
