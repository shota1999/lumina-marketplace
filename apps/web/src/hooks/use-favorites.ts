'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { toast } from '@/hooks/use-toast';

import { useAnalytics } from './use-analytics';

interface FavoriteItem {
  id: string;
  listingId: string;
  userId: string;
  createdAt: string;
  listing?: unknown;
}

export function useFavorites() {
  const queryClient = useQueryClient();
  const { track } = useAnalytics();

  const { data: favorites = [], isLoading: isFetching } = useQuery<FavoriteItem[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await fetch('/api/favorites');
      if (res.status === 401) return [];
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.code === 'UNAUTHORIZED'
            ? 'LOGIN_REQUIRED'
            : (json.error?.message ?? 'Failed to update favorites'),
        );
      }
      return json;
    },
    onMutate: async (listingId: string) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previous = queryClient.getQueryData<FavoriteItem[]>(['favorites']);
      const wasInList = previous?.some((f) => f.listingId === listingId);

      queryClient.setQueryData<FavoriteItem[]>(['favorites'], (old = []) =>
        wasInList
          ? old.filter((f) => f.listingId !== listingId)
          : [
              ...old,
              {
                id: `temp-${listingId}`,
                listingId,
                userId: '',
                createdAt: new Date().toISOString(),
              },
            ],
      );

      return { previous, wasInList };
    },
    onSuccess: (data, listingId) => {
      const action = data.data?.action as 'added' | 'removed';
      track(action === 'added' ? 'favorite_add' : 'favorite_remove', { listingId });
      toast({
        title: action === 'added' ? 'Saved to favorites' : 'Removed from favorites',
        description: action === 'added' ? 'You can find it in your favorites page' : undefined,
      });
    },
    onError: (error: Error, _listingId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites'], context.previous);
      }
      if (error.message === 'LOGIN_REQUIRED') {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save favorites',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to update favorites',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const isFavorited = useCallback(
    (listingId: string) => favorites.some((f) => f.listingId === listingId),
    [favorites],
  );

  return {
    favorites,
    toggle: toggleMutation.mutate,
    isFavorited,
    isLoading: toggleMutation.isPending || isFetching,
  };
}
