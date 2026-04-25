'use client';

import { useEffect } from 'react';

import { useAnalytics } from '@/hooks/use-analytics';

export function TrackListingView({ listingId }: { listingId: string }) {
  const { track } = useAnalytics();

  useEffect(() => {
    track('listing_view', { listingId });
  }, [listingId, track]);

  return null;
}
