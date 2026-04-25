import { WifiOff } from 'lucide-react';
import type { Metadata } from 'next';

import { ReloadButton } from './reload-button';

export const metadata: Metadata = {
  title: 'Offline',
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <WifiOff className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-50">
          You&apos;re offline
        </h1>
        <p className="mb-8 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          It looks like you&apos;ve lost your internet connection. Some content may be available
          from cache, but new pages require a connection.
        </p>
        <ReloadButton />
      </div>
    </div>
  );
}
