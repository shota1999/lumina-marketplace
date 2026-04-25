import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchPageContent } from './search-content';

export const dynamic = 'force-dynamic';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = typeof params['q'] === 'string' ? params['q'] : undefined;
  const category = typeof params['category'] === 'string' ? params['category'] : undefined;

  const title = query
    ? `Search: ${query}`
    : category
      ? `${category.charAt(0).toUpperCase() + category.slice(1)} rentals`
      : 'Search premium rentals';

  return {
    title,
    description: `Find and book premium ${category ?? ''} rentals. ${query ? `Results for "${query}".` : 'Browse our curated collection.'}`,
    robots: { index: !query, follow: true },
  };
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
