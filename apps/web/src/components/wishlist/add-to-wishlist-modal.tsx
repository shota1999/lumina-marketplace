'use client';

import { Check, Globe, Heart, Loader2, Lock, Plus, X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { toast } from '@/hooks/use-toast';

interface Wishlist {
  id: string;
  name: string;
  isPublic: boolean;
  itemCount: number;
}

interface AddToWishlistModalProps {
  listingId: string;
  trigger: ReactNode;
}

export function AddToWishlistModal({ listingId, trigger }: AddToWishlistModalProps) {
  const [open, setOpen] = useState(false);
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // New collection inline form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [wlRes, checkedRes] = await Promise.all([
        fetch('/api/wishlists'),
        fetch(`/api/listings/${listingId}/wishlists`),
      ]);
      if (!wlRes.ok || !checkedRes.ok) throw new Error('Fetch failed');
      const wlData = await wlRes.json();
      const checkedData = await checkedRes.json();
      setWishlists(wlData);
      setCheckedIds(new Set(checkedData.map((w: { id: string }) => w.id)));
    } catch {
      toast({ title: 'Failed to load collections', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (open) {
      fetchData();
      setShowCreate(false);
      setNewName('');
      setNewPublic(false);
    }
  }, [open, fetchData]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const handleToggle = async (wishlistId: string) => {
    const isIn = checkedIds.has(wishlistId);
    try {
      setToggling(wishlistId);
      if (isIn) {
        const res = await fetch(`/api/wishlists/${wishlistId}/items/${listingId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Remove failed');
        setCheckedIds((prev) => {
          const next = new Set(prev);
          next.delete(wishlistId);
          return next;
        });
        toast({ title: 'Removed from collection' });
      } else {
        const res = await fetch(`/api/wishlists/${wishlistId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId }),
        });
        if (!res.ok) throw new Error('Add failed');
        setCheckedIds((prev) => new Set(prev).add(wishlistId));
        toast({ title: 'Added to collection' });
      }
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      setCreating(true);
      const res = await fetch('/api/wishlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), isPublic: newPublic }),
      });
      if (!res.ok) throw new Error('Create failed');
      const created = await res.json();
      setWishlists((prev) => [...prev, created]);
      // Auto-add listing to the new collection
      await handleToggle(created.id);
      setNewName('');
      setNewPublic(false);
      setShowCreate(false);
    } catch {
      toast({ title: 'Failed to create collection', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Trigger */}
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  Save to Collection
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-80 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : wishlists.length === 0 && !showCreate ? (
                <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                  <Heart className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                    No collections yet
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
                  >
                    <Plus className="h-4 w-4" />
                    Create Collection
                  </button>
                </div>
              ) : (
                <>
                  {wishlists.map((wl) => {
                    const isChecked = checkedIds.has(wl.id);
                    const isToggling = toggling === wl.id;
                    return (
                      <button
                        key={wl.id}
                        onClick={() => handleToggle(wl.id)}
                        disabled={isToggling}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {/* Checkbox */}
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            isChecked
                              ? 'border-slate-900 bg-slate-900 dark:border-slate-50 dark:bg-slate-50'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3 w-3 animate-spin text-white dark:text-slate-900" />
                          ) : isChecked ? (
                            <Check className="h-3 w-3 text-white dark:text-slate-900" />
                          ) : null}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {wl.name}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {wl.itemCount} {wl.itemCount === 1 ? 'listing' : 'listings'}
                          </p>
                        </div>

                        {/* Visibility icon */}
                        {wl.isPublic ? (
                          <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Create new collection section */}
            <div className="border-t border-slate-100 dark:border-slate-800">
              {showCreate ? (
                <div className="space-y-3 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    New Collection
                  </p>
                  <input
                    type="text"
                    placeholder="Collection name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                    }}
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setNewPublic((v) => !v)}
                      className="flex items-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {newPublic ? (
                        <Globe className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      {newPublic ? 'Public' : 'Private'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowCreate(false);
                          setNewName('');
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreate}
                        disabled={creating || !newName.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900"
                      >
                        {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                        Create & Add
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex w-full items-center gap-3 px-6 py-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Create New Collection
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
