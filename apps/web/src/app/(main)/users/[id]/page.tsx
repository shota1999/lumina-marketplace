'use client';

import { Calendar, Home, Loader2, MessageSquare, Shield, Star, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProfileUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

interface ProfileStats {
  reviewsGivenCount: number;
  listingsCount?: number;
  averageRating?: number;
}

interface ProfileReview {
  id: string;
  listingId: string;
  rating: number;
  comment: string;
  createdAt: string;
  listingTitle: string;
}

interface ProfileData {
  user: ProfileUser;
  stats: ProfileStats;
  recentReviews: ProfileReview[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/users/${id}/profile`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message ?? 'User not found');
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Avatar skeleton */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="h-24 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="mx-auto h-7 w-48 animate-pulse rounded-xl bg-slate-200 sm:mx-0 dark:bg-slate-700" />
            <div className="mx-auto h-4 w-32 animate-pulse rounded-xl bg-slate-200 sm:mx-0 dark:bg-slate-700" />
            <div className="mx-auto h-4 w-24 animate-pulse rounded-xl bg-slate-200 sm:mx-0 dark:bg-slate-700" />
          </div>
        </div>
        {/* Bio skeleton */}
        <div className="mt-8 space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-20 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
        {/* Stats skeleton */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        {/* Reviews skeleton */}
        <div className="mt-8 space-y-4">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-32 text-center">
        <User className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
        <h1 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          {error ?? 'User not found'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This profile could not be loaded.
        </p>
      </div>
    );
  }

  const { user, stats, recentReviews } = data;
  const isHost = user.role === 'host';
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-24 w-24 rounded-full border-2 border-slate-200 object-cover dark:border-slate-700"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {getInitials(user.name)}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {user.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              Member since {memberSince}
            </span>
            {user.isVerified && (
              <span className="flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <Shield className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
            {isHost && (
              <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Host
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            About
          </p>
          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            {user.bio}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Stats
        </p>
        <div className={`mt-2 grid gap-4 ${isHost ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-1'}`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                <MessageSquare className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.reviewsGivenCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reviews given
                </p>
              </div>
            </div>
          </div>

          {isHost && stats.listingsCount !== undefined && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                  <Home className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.listingsCount}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Listings
                  </p>
                </div>
              </div>
            </div>
          )}

          {isHost && stats.averageRating !== undefined && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                  <Star className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Average rating
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Host link */}
      {isHost && (
        <div className="mt-6">
          <Link
            href={`/search?hostId=${user.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Home className="h-4 w-4" />
            View Listings
          </Link>
        </div>
      )}

      {/* Recent reviews */}
      {recentReviews.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Reviews by {user.name}
          </p>
          <div className="mt-3 space-y-4">
            {recentReviews.map((review) => {
              const reviewDate = new Date(review.createdAt).toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric', year: 'numeric' },
              );
              return (
                <div
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {review.listingTitle}
                    </h3>
                    <span className="text-xs text-slate-400">{reviewDate}</span>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {review.comment}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentReviews.length === 0 && (
        <div className="mt-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Reviews by {user.name}
          </p>
          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No reviews yet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
