import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getCurrentUser } from '@/lib/auth';

import { AdminShell } from './admin-shell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  return (
    <AdminShell user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl ?? null }}>
      {children}
    </AdminShell>
  );
}
