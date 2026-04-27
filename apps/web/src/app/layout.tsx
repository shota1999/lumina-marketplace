import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { DemoQuickLogin } from '@/components/demo-quick-login';
import { PWARegister } from '@/components/pwa-register';
import { WebVitals } from '@/components/web-vitals';

import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Lumina — Premium Rental Marketplace',
    template: '%s | Lumina',
  },
  description:
    'Discover extraordinary stays and curated experiences. Premium villas, cabins, treehouses, and more.',
  metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'),
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lumina',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Lumina Marketplace',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <DemoQuickLogin />
        <PWARegister />
        <WebVitals />
      </body>
    </html>
  );
}
