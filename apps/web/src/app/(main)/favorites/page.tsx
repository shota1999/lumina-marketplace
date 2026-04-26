'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';

import { Skeleton } from '@lumina/ui';

import { ListingCard } from '@/components/listing/listing-card';
import { useFavorites } from '@/hooks/use-favorites';

function FavoritesSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-white dark:bg-slate-900">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-6">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-10" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-6 w-1/3" />
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const { favorites, toggle, isFavorited, isLoading } = useFavorites();

  return (
    <div className="container py-16">
      {/* Header */}
      <header className="mb-12">
        <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Your Favorites
        </h1>
        <p className="font-medium text-slate-500 dark:text-slate-400">
          Manage your curated collection of premium stays and experiences.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FavoritesSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        /* Empty state */
        <div className="mx-auto flex max-w-md flex-col items-center justify-center py-32 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Heart className="h-9 w-9 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-50">
            No favorites yet
          </h2>
          <p className="mb-8 leading-relaxed text-slate-500 dark:text-slate-400">
            Heart listings you love to save them here for later. Your dream getaway is just a click
            away.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-10 py-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav) =>
              fav.listing ? (
                <ListingCard
                  key={fav.id}
                  listing={fav.listing as React.ComponentProps<typeof ListingCard>['listing']}
                  onFavorite={toggle}
                  isFavorited={true}
                />
              ) : null,
            )}
          </div>

          {/* Load more */}
          {favorites.length >= 6 && (
            <div className="mt-20 flex justify-center">
              <button className="rounded-lg border border-slate-200 bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800">
                Show more results
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
