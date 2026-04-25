import type { ReactNode } from 'react';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { SkipToContent } from '@/components/layout/skip-to-content';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
      <Footer />
    </>
  );
}
