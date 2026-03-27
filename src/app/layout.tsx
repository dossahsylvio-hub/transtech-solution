import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bor-Bi | TransTech Solution',
  description: 'Gestion simplifiée pour commerçants - Bor-Bi par TransTech Solution',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a8a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" dir="ltr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
