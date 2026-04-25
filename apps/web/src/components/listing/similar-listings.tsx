import { Compass } from 'lucide-react';
import Link from 'next/link';

import type { Listing } from '@lumina/shared';
import { Button } from '@lumina/ui';

import { ListingCard } from './listing-card';

interface SimilarListingsProps {
  listings: Listing[];
}

export function SimilarListings({ listings }: SimilarListingsProps) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Compass className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">No similar listings found</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Explore all available properties instead.
        </p>
        <Button variant="outline" asChild>
          <Link href="/search">Browse all listings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
