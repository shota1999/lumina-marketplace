'use client';

import { Globe, Heart, Lock, Loader2, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface Wishlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  coverImage?: string;
  itemCount: number;
}

function WishlistCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export default function WishlistsPage() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPublic, setFormPublic] = useState(false);

  const fetchWishlists = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/wishlists');
      if (!res.ok) throw new Error('Failed to fetch wishlists');
      const data = await res.json();
      setWishlists(data);
    } catch {
      toast({ title: 'Error loading collections', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlists();
  }, [fetchWishlists]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      setCreating(true);
      const res = await fetch('/api/wishlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          isPublic: formPublic,
        }),
      });
      if (!res.ok) throw new Error('Failed to create collection');
      const created = await res.json();
      setWishlists((prev) => [created, ...prev]);
      setFormName('');
      setFormDescription('');
      setFormPublic(false);
      setShowForm(false);
      toast({ title: 'Collection created' });
    } catch {
      toast({ title: 'Failed to create collection', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container py-16">
      {/* Header */}
      <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Collections
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            My Collections
          </h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </button>
      </header>

      {/* Inline create form */}
      {showForm && (
        <div className="mb-10 rounded-2xl bg-white p-6 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Create Collection
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-3">
              <input
                type="text"
                placeholder="Collection name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFormPublic((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {formPublic ? (
                  <Globe className="h-4 w-4 text-slate-500" />
                ) : (
                  <Lock className="h-4 w-4 text-slate-500" />
                )}
                {formPublic ? 'Public' : 'Private'}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !formName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <WishlistCardSkeleton key={i} />
          ))}
        </div>
      ) : wishlists.length === 0 ? (
        /* Empty state */
        <div className="mx-auto flex max-w-md flex-col items-center justify-center py-32 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Heart className="h-9 w-9 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-50">
            No collections yet
          </h2>
          <p className="mb-8 leading-relaxed text-slate-500 dark:text-slate-400">
            Organize your favorite listings into collections. Group by trip, destination, or vibe.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-10 py-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
          >
            <Plus className="h-4 w-4" />
            Create your first collection
          </button>
        </div>
      ) : (
        /* Wishlists grid */
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {wishlists.map((wl) => (
            <Link
              key={wl.id}
              href={`/wishlists/${wl.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
            >
              {/* Cover image or gradient placeholder */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {wl.coverImage ? (
                  <Image
                    src={wl.coverImage}
                    alt={wl.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800">
                    <Heart className="h-10 w-10 text-slate-400/50 dark:text-slate-500/50" />
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

                {/* Badge */}
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-md">
                  {wl.isPublic ? (
                    <Globe className="h-3 w-3 text-white" />
                  ) : (
                    <Lock className="h-3 w-3 text-white" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                    {wl.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>

                {/* Item count */}
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="text-xs font-bold text-white/70">
                    {wl.itemCount} {wl.itemCount === 1 ? 'listing' : 'listings'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="px-5 pb-5 pt-4">
                <h3 className="line-clamp-1 text-[15px] font-bold leading-tight text-slate-900 dark:text-slate-50">
                  {wl.name}
                </h3>
                {wl.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {wl.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
