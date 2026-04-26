import { Home, Search } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@lumina/ui';

export default function ListingNotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="bg-secondary mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <Search className="text-muted-foreground h-10 w-10" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Listing not found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The listing you&apos;re looking for may have been removed, renamed, or is temporarily
        unavailable.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            Browse listings
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  );
}
