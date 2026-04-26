'use client';

import { Loader2, LogIn, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface ReviewFormProps {
  listingId: string;
}

export function ReviewForm({ listingId }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (rating === 0) {
        toast({ title: 'Please select a rating', variant: 'destructive' });
        return;
      }
      if (comment.length < 10) {
        toast({
          title: 'Review too short',
          description: 'Please write at least 10 characters',
          variant: 'destructive',
        });
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId, rating, comment }),
        });
        const data = await res.json();

        if (res.status === 401) {
          setAuthError(true);
          return;
        }

        if (!res.ok || !data.success) {
          const msg = data.error?.message ?? 'Failed to submit review';
          if (data.error?.code === 'DUPLICATE') {
            toast({
              title: 'Already reviewed',
              description: 'You have already reviewed this listing',
            });
            setSubmitted(true);
          } else {
            toast({ title: 'Review failed', description: msg, variant: 'destructive' });
          }
          return;
        }

        setSubmitted(true);
        toast({ title: 'Review submitted!', description: 'Thank you for your feedback' });
        router.refresh();
      } catch {
        toast({
          title: 'Network error',
          description: 'Could not submit review',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [listingId, rating, comment, router],
  );

  if (authError) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <LogIn className="text-muted-foreground mb-3 h-8 w-8" />
          <p className="mb-1 font-medium">Sign in to leave a review</p>
          <p className="text-muted-foreground mb-4 text-sm">
            Share your experience with other travelers.
          </p>
          <Button asChild size="sm">
            <a href="/auth/login">Sign in</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="border-dashed bg-green-50 dark:bg-green-950/20">
        <CardContent className="flex flex-col items-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Star className="h-6 w-6 fill-green-600 text-green-600" />
          </div>
          <p className="font-medium">Thanks for your review!</p>
          <p className="text-muted-foreground text-sm">Your feedback helps other travelers.</p>
        </CardContent>
      </Card>
    );
  }

  const displayRating = hoveredRating || rating;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Write a review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star rating */}
          <div>
            <label className="mb-2 block text-sm font-medium">Your rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:ring-ring rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= displayRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-muted-foreground ml-2 self-center text-sm">
                  {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="review-comment" className="mb-2 block text-sm font-medium">
              Your experience
            </label>
            <textarea
              id="review-comment"
              rows={4}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              placeholder="Tell others about your stay — what did you love? What could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {comment.length}/2000 characters{' '}
              {comment.length > 0 && comment.length < 10 && '(minimum 10)'}
            </p>
          </div>

          <Button type="submit" disabled={submitting || rating === 0 || comment.length < 10}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              'Submit review'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
