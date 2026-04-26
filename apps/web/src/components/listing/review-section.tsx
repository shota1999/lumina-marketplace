import { MessageSquare, Star } from 'lucide-react';

import type { Review } from '@lumina/shared';

interface ReviewSectionProps {
  reviews: Review[];
  averageRating: number;
  totalCount: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
        />
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function ReviewSection({ reviews, averageRating, totalCount }: ReviewSectionProps) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
        <MessageSquare className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="font-medium text-slate-900 dark:text-slate-50">No reviews yet</p>
        <p className="mt-1 text-sm text-slate-500">Be the first to share your experience.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Review cards — 2 column grid */}
      <div className="grid gap-10 md:grid-cols-2">
        {reviews.map((review) => (
          <div key={review.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {getInitials(review.author.name)}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-50">{review.author.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Stayed {formatReviewDate(review.createdAt)}
                </p>
              </div>
            </div>
            <p className="leading-relaxed text-slate-500 dark:text-slate-400">{review.comment}</p>
          </div>
        ))}
      </div>

      {reviews.length >= 4 && (
        <button className="rounded-lg border border-slate-900 px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-200 dark:text-slate-200 dark:hover:bg-slate-800">
          Show all reviews
        </button>
      )}
    </div>
  );
}
