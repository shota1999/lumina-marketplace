'use client';

import {
  Check,
  Globe,
  Heart,
  Loader2,
  Lock,
  Trash2,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@lumina/ui';

import { ListingCard } from '@/components/listing/listing-card';
import { toast } from '@/hooks/use-toast';

type WishlistListingPreview = React.ComponentProps<typeof ListingCard>['listing'];

interface WishlistItem {
  id: string;
  listing: WishlistListingPreview;
}

interface WishlistDetail {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  items: WishlistItem[];
}

function DetailSkeleton() {
  return (
    <div className="container py-16">
      <div className="mb-12 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WishlistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [wishlist, setWishlist] = useState<WishlistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  // Inline editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  const [togglingPublic, setTogglingPublic] = useState(false);

  const fetchWishlist = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/wishlists/${id}`);
      if (!res.ok) throw new Error('Failed to fetch wishlist');
      const data = await res.json();
      setWishlist(data);
      setNameValue(data.name);
      setDescValue(data.description ?? '');
    } catch {
      toast({ title: 'Error loading collection', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const patchWishlist = async (patch: Record<string, unknown>) => {
    const res = await fetch(`/api/wishlists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Update failed');
    return res.json();
  };

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === wishlist?.name) {
      setEditingName(false);
      return;
    }
    try {
      setSavingName(true);
      const updated = await patchWishlist({ name: nameValue.trim() });
      setWishlist((prev) => (prev ? { ...prev, name: updated.name } : prev));
      setEditingName(false);
      toast({ title: 'Name updated' });
    } catch {
      toast({ title: 'Failed to update name', variant: 'destructive' });
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveDesc = async () => {
    if (descValue.trim() === (wishlist?.description ?? '')) {
      setEditingDesc(false);
      return;
    }
    try {
      setSavingDesc(true);
      const updated = await patchWishlist({ description: descValue.trim() || null });
      setWishlist((prev) =>
        prev ? { ...prev, description: updated.description } : prev,
      );
      setEditingDesc(false);
      toast({ title: 'Description updated' });
    } catch {
      toast({ title: 'Failed to update description', variant: 'destructive' });
    } finally {
      setSavingDesc(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!wishlist) return;
    try {
      setTogglingPublic(true);
      const updated = await patchWishlist({ isPublic: !wishlist.isPublic });
      setWishlist((prev) =>
        prev ? { ...prev, isPublic: updated.isPublic } : prev,
      );
      toast({ title: updated.isPublic ? 'Collection is now public' : 'Collection is now private' });
    } catch {
      toast({ title: 'Failed to update visibility', variant: 'destructive' });
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this collection? This cannot be undone.')) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/wishlists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Collection deleted' });
      router.push('/wishlists');
    } catch {
      toast({ title: 'Failed to delete collection', variant: 'destructive' });
      setDeleting(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setRemovingItem(itemId);
      const res = await fetch(`/api/wishlists/${id}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Remove failed');
      setWishlist((prev) =>
        prev
          ? { ...prev, items: prev.items.filter((it) => it.id !== itemId) }
          : prev,
      );
      toast({ title: 'Listing removed from collection' });
    } catch {
      toast({ title: 'Failed to remove listing', variant: 'destructive' });
    } finally {
      setRemovingItem(null);
    }
  };

  if (isLoading) return <DetailSkeleton />;
  if (!wishlist) {
    return (
      <div className="container flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">
          Collection not found
        </h2>
        <button
          onClick={() => router.push('/wishlists')}
          className="mt-4 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
        >
          Back to collections
        </button>
      </div>
    );
  }

  return (
    <div className="container py-16">
      {/* Header */}
      <header className="mb-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Collection
        </p>

        {/* Editable name */}
        {editingName ? (
          <div className="mb-2 flex items-center gap-3">
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setNameValue(wishlist.name);
                  setEditingName(false);
                }
              }}
              className="text-4xl font-extrabold tracking-tight bg-transparent text-slate-900 dark:text-slate-50 border-b-2 border-slate-300 dark:border-slate-600 focus:border-slate-900 dark:focus:border-slate-50 outline-none pb-1"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
            >
              {savingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => {
                setNameValue(wishlist.name);
                setEditingName(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <h1
            onClick={() => setEditingName(true)}
            className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-2 cursor-pointer hover:opacity-70 transition-opacity"
            title="Click to edit"
          >
            {wishlist.name}
          </h1>
        )}

        {/* Editable description */}
        {editingDesc ? (
          <div className="mb-4 flex items-center gap-3">
            <input
              type="text"
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveDesc();
                if (e.key === 'Escape') {
                  setDescValue(wishlist.description ?? '');
                  setEditingDesc(false);
                }
              }}
              autoFocus
              placeholder="Add a description..."
              className="flex-1 bg-transparent text-slate-500 dark:text-slate-400 font-medium border-b border-slate-300 dark:border-slate-600 focus:border-slate-900 dark:focus:border-slate-50 outline-none pb-1"
            />
            <button
              onClick={handleSaveDesc}
              disabled={savingDesc}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
            >
              {savingDesc ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ) : (
          <p
            onClick={() => setEditingDesc(true)}
            className="text-slate-500 dark:text-slate-400 font-medium mb-4 cursor-pointer hover:opacity-70 transition-opacity"
            title="Click to edit"
          >
            {wishlist.description || 'Add a description...'}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePublic}
            disabled={togglingPublic}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {togglingPublic ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : wishlist.isPublic ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {wishlist.isPublic ? 'Public' : 'Private'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </header>

      {/* Items */}
      {wishlist.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-5">
            <Heart className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            No listings yet
          </h2>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Browse listings and add them to this collection using the heart icon.
          </p>
          <a
            href="/search"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
          >
            Browse listings
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {wishlist.items.map((item) => (
            <div key={item.id} className="group/item relative">
              <ListingCard listing={item.listing} />
              {/* Remove button */}
              <button
                onClick={() => handleRemoveItem(item.id)}
                disabled={removingItem === item.id}
                className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-md transition-all hover:bg-red-600 group-hover/item:opacity-100"
                title="Remove from collection"
              >
                {removingItem === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
