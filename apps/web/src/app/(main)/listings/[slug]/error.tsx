'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@lumina/ui';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ListingError({ error, reset }: ErrorProps) {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
      <p className="mb-2 max-w-md text-muted-foreground">
        We couldn&apos;t load this listing. This might be a temporary issue — please try again.
      </p>
      {error.digest && (
        <p className="mb-6 text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <Button onClick={reset} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
