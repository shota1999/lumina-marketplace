'use client';

import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SearchError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
          Unable to load search results
        </h1>
        <p className="mb-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          An unexpected error occurred while loading search results. Please try again.
        </p>
        {error.digest && (
          <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-slate-50 dark:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
