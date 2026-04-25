'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface SearchPaginationProps {
  totalPages: number;
  currentPage: number;
}

export function SearchPagination({ totalPages, currentPage }: SearchPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(page));
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams],
  );

  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-white hover:text-slate-900 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-50"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className="px-1 text-sm text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => goToPage(page as number)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-all ${
              page === currentPage
                ? 'bg-slate-900 text-white shadow-md dark:bg-slate-50 dark:text-slate-900'
                : 'border border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {page}
          </button>
        ),
      )}

      <button
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-white hover:text-slate-900 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-50"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
