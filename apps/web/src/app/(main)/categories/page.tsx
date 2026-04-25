import {
  ArrowRight,
  Building,
  Castle,
  Crown,
  Home,
  Mountain,
  Sailboat,
  Sparkles,
  TreePine,
  Tractor,
  Warehouse,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb, listingImages, listings } from '@lumina/db';
import { formatPrice } from '@lumina/shared';

export const metadata: Metadata = {
  title: 'Categories – Lumina',
  description: 'Browse premium rental listings by category — villas, cabins, treehouses, castles, and more.',
};

const CATEGORY_META: Record<
  string,
  {
    label: string;
    tagline: string;
    icon: typeof Building;
    gradient: string;
    iconColor: string;
  }
> = {
  villa: {
    label: 'Villas',
    tagline: 'Private estates & infinity pools',
    icon: Building,
    gradient: 'from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  apartment: {
    label: 'Apartments',
    tagline: 'Urban retreats in iconic cities',
    icon: Home,
    gradient: 'from-rose-500/10 to-rose-600/5 dark:from-rose-500/20 dark:to-rose-600/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  cabin: {
    label: 'Cabins',
    tagline: 'Timber sanctuaries in ancient forests',
    icon: TreePine,
    gradient: 'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  treehouse: {
    label: 'Treehouses',
    tagline: 'Suspended above the canopy',
    icon: Mountain,
    gradient: 'from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  boat: {
    label: 'Boats',
    tagline: 'Luxury yachts & houseboats',
    icon: Sailboat,
    gradient: 'from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-600/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  castle: {
    label: 'Castles',
    tagline: 'Royal elegance & timeless grandeur',
    icon: Castle,
    gradient: 'from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  farmhouse: {
    label: 'Farmhouses',
    tagline: 'Vineyards & rolling countryside',
    icon: Tractor,
    gradient: 'from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-600/10',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  penthouse: {
    label: 'Penthouses',
    tagline: 'Panoramic skyline living',
    icon: Crown,
    gradient: 'from-indigo-500/10 to-indigo-600/5 dark:from-indigo-500/20 dark:to-indigo-600/10',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
};

async function getCategoryCounts() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        category: listings.category,
        count: sql<number>`count(*)::int`,
      })
      .from(listings)
      .where(eq(listings.status, 'published'))
      .groupBy(listings.category);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.category] = row.count;
    }
    return counts;
  } catch {
    return {};
  }
}

async function getFeaturedListings() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        slug: listings.slug,
        city: listings.city,
        country: listings.country,
        category: listings.category,
        pricePerNight: listings.pricePerNight,
        currency: listings.currency,
        imageUrl: listingImages.url,
        imageAlt: listingImages.alt,
      })
      .from(listings)
      .innerJoin(
        listingImages,
        and(eq(listingImages.listingId, listings.id), eq(listingImages.isPrimary, true)),
      )
      .where(and(eq(listings.status, 'published'), eq(listings.featured, true)))
      .orderBy(desc(listings.createdAt))
      .limit(3);

    return rows;
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const [counts, featuredListings] = await Promise.all([getCategoryCounts(), getFeaturedListings()]);

  const categories = Object.entries(CATEGORY_META).map(([slug, meta]) => ({
    slug,
    ...meta,
    count: counts[slug] ?? 0,
  }));

  const totalListings = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 px-8 py-24 dark:bg-slate-950">
        {/* Decorative grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative mx-auto max-w-[1400px]">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
            Curated Collections
          </p>
          <h1 className="mb-6 max-w-3xl text-5xl font-extrabold tracking-tight text-white md:text-6xl">
            Find your perfect
            <br />
            <span className="bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
              escape.
            </span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-400">
            {totalListings > 0
              ? `${totalListings.toLocaleString()} hand-curated premium rentals across 8 exclusive categories.`
              : '8 exclusive categories of hand-curated premium rentals for the discerning traveler.'}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-8">
        {/* Category Grid */}
        <section className="-mt-12 relative z-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  href={`/search?category=${cat.slug}`}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cat.gradient}`}
                >
                  {/* Card bg */}
                  <div className="absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-sm dark:bg-slate-900/80" />

                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-slate-800 ${cat.iconColor}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 -translate-x-2 text-slate-300 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 dark:text-slate-600" />
                    </div>
                    <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                      {cat.label}
                    </h3>
                    <p className="mb-4 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {cat.tagline}
                    </p>
                    <div className="flex items-center gap-2">
                      {cat.count > 0 ? (
                        <>
                          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                            {cat.count}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            listings
                          </span>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:bg-slate-800">
                          Coming soon
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured Listings */}
        {featuredListings.length >= 2 && (
          <section className="py-24">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Editor&apos;s picks
                  </span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                  Featured properties
                </h2>
              </div>
              <Link
                href="/search?sort=rating_desc"
                className="hidden items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 sm:flex dark:text-slate-400 dark:hover:text-slate-50"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              {/* Large feature card */}
              <Link
                href={`/listings/${featuredListings[0]!.slug}`}
                className="group relative min-h-[500px] overflow-hidden rounded-3xl md:col-span-7"
              >
                <Image
                  src={featuredListings[0]!.imageUrl}
                  alt={featuredListings[0]!.imageAlt || featuredListings[0]!.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 58vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-10">
                  <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                    <Sparkles className="h-3 w-3" />
                    Featured
                  </span>
                  <h3 className="mb-2 text-3xl font-bold text-white md:text-4xl">
                    {featuredListings[0]!.title}
                  </h3>
                  <div className="flex items-center gap-4">
                    <p className="text-slate-300">
                      {featuredListings[0]!.city}, {featuredListings[0]!.country}
                    </p>
                    <span className="text-lg font-bold text-white">
                      {formatPrice(Number(featuredListings[0]!.pricePerNight), featuredListings[0]!.currency)}
                      <span className="text-sm font-normal text-slate-300">/night</span>
                    </span>
                  </div>
                </div>
              </Link>

              {/* Right column */}
              <div className="flex flex-col gap-6 md:col-span-5">
                <Link
                  href={`/listings/${featuredListings[1]!.slug}`}
                  className="group relative min-h-[240px] flex-1 overflow-hidden rounded-3xl"
                >
                  <Image
                    src={featuredListings[1]!.imageUrl}
                    alt={featuredListings[1]!.imageAlt || featuredListings[1]!.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 42vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                      {featuredListings[1]!.category}
                    </p>
                    <h3 className="mb-1 text-xl font-bold text-white">
                      {featuredListings[1]!.title}
                    </h3>
                    <p className="text-sm text-slate-300">
                      {featuredListings[1]!.city}, {featuredListings[1]!.country}
                    </p>
                  </div>
                </Link>

                {featuredListings[2] ? (
                  <Link
                    href={`/listings/${featuredListings[2].slug}`}
                    className="group relative min-h-[240px] flex-1 overflow-hidden rounded-3xl"
                  >
                    <Image
                      src={featuredListings[2].imageUrl}
                      alt={featuredListings[2].imageAlt || featuredListings[2].title}
                      fill
                      sizes="(max-width: 768px) 100vw, 42vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                        {featuredListings[2].category}
                      </p>
                      <h3 className="mb-1 text-xl font-bold text-white">
                        {featuredListings[2].title}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {featuredListings[2].city}, {featuredListings[2].country}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800">
                    <p className="text-sm font-medium text-slate-400">More coming soon</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="pb-24">
          <div className="overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-800">
            <div className="flex flex-col items-center px-8 py-20 text-center">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                Can&apos;t decide?
              </p>
              <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
                Let us find it for you.
              </h2>
              <p className="mb-10 max-w-md text-slate-400">
                Use our advanced search to filter by location, price, amenities, and more.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/search"
                  className="rounded-xl bg-white px-8 py-4 font-semibold text-slate-900 transition-all hover:bg-slate-100"
                >
                  Explore all listings
                </Link>
                <Link
                  href="/experiences"
                  className="rounded-xl border border-white/10 px-8 py-4 font-semibold text-white transition-all hover:bg-white/5"
                >
                  Browse experiences
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
