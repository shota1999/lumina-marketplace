import { Bath, Bed, ChevronRight, Heart, MapPin, Share2, Star, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatPrice } from '@lumina/shared';

import { AmenitiesGrid } from '@/components/listing/amenities-grid';
import { BookingSidebar } from '@/components/listing/booking-sidebar';
import { ContactHostButton } from '@/components/messaging/contact-host-button';
import { ImageGalleryLazy as ImageGallery } from '@/components/listing/image-gallery-lazy';
import { MapPreview } from '@/components/listing/map-preview';
import { ReviewForm } from '@/components/listing/review-form';
import { ReviewSection } from '@/components/listing/review-section';
import { SimilarListings } from '@/components/listing/similar-listings';
import { TrackListingView } from '@/components/listing/track-listing-view';
import { getListingBySlug } from '@/lib/queries/get-listing';

// ISR: revalidate listing pages every 5 minutes (also revalidated on-demand via tags)
export const revalidate = 300;

interface ListingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getListingBySlug(slug);

  if (!data) {
    return { title: 'Listing not found' };
  }

  const { listing } = data;
  const primaryImage = listing.images.find((img) => img.isPrimary) ?? listing.images[0];

  return {
    title: `${listing.title} | ${listing.location.city}, ${listing.location.country}`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      type: 'website',
      images: primaryImage
        ? [{ url: primaryImage.url, width: primaryImage.width, height: primaryImage.height, alt: primaryImage.alt }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.title,
      description: listing.description.slice(0, 160),
    },
    alternates: {
      canonical: `/listings/${slug}`,
    },
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { slug } = await params;
  const data = await getListingBySlug(slug);

  if (!data) {
    notFound();
  }

  const { listing, reviews, similar: similarListings } = data;

  return (
    <>
      <TrackListingView listingId={listing.id} />
      <main className="mx-auto max-w-7xl px-6 pt-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-slate-900 dark:hover:text-slate-200">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/search" className="transition-colors hover:text-slate-900 dark:hover:text-slate-200">
            Search
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-slate-900 dark:text-slate-50">{listing.title}</span>
        </nav>

        {/* Title Row */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              {listing.featured && (
                <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white dark:bg-slate-200 dark:text-slate-900">
                  Featured
                </span>
              )}
              {listing.rating > 0 && (
                <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span>{listing.rating.toFixed(2)}</span>
                </div>
              )}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl dark:text-slate-50">
              {listing.title}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <MapPin className="h-4 w-4" />
              <span className="font-medium underline decoration-slate-300/30">
                {listing.location.city}, {listing.location.state}, {listing.location.country}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              <Heart className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>

        {/* Image gallery */}
        <div className="mb-12">
          <ImageGallery images={listing.images} title={listing.title} />
        </div>

        {/* Content Layout */}
        <div className="mb-20 grid grid-cols-1 gap-16 lg:grid-cols-[1fr_380px]">
          {/* Left Column: Details */}
          <div className="space-y-12">
            {/* Quick Specs */}
            <section className="flex flex-wrap gap-8 border-b border-slate-200/50 py-8 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">{listing.maxGuests} Guests</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Capacity</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <Bed className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">{listing.bedrooms} Bedroom{listing.bedrooms !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Suites</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <Bath className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-50">{listing.bathrooms} Bath{listing.bathrooms !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Luxury</p>
                </div>
              </div>
            </section>

            {/* About */}
            <section>
              <h2 className="mb-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">About this place</h2>
              <div className="space-y-4 text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                {listing.description.split('\n\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Amenities */}
            <section>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">What this place offers</h2>
              <AmenitiesGrid amenities={listing.amenities} />
            </section>

            {/* Map */}
            <section>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Where you&apos;ll be</h2>
              <MapPreview
                lat={listing.location.lat}
                lng={listing.location.lng}
                address={listing.location.address}
                city={listing.location.city}
                state={listing.location.state}
                country={listing.location.country}
              />
            </section>

            {/* Reviews */}
            <section>
              <div className="mb-8 flex items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Guest reviews</h2>
                {listing.rating > 0 && (
                  <div className="flex items-center gap-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    {listing.rating.toFixed(2)} &middot; {listing.reviewCount} reviews
                  </div>
                )}
              </div>
              <ReviewSection
                reviews={reviews}
                averageRating={listing.rating}
                totalCount={listing.reviewCount}
              />
              <div className="mt-8">
                <ReviewForm listingId={listing.id} />
              </div>
            </section>
          </div>

          {/* Right Column: Booking Sidebar */}
          <aside className="relative hidden lg:block">
            <BookingSidebar
              listingId={listing.id}
              pricePerNight={listing.pricePerNight}
              currency={listing.currency}
              rating={listing.rating}
              reviewCount={listing.reviewCount}
              maxGuests={listing.maxGuests}
            />
            <div className="mt-4">
              <ContactHostButton listingId={listing.id} />
            </div>
          </aside>
        </div>

        {/* Mobile booking bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-lg lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">{formatPrice(listing.pricePerNight, listing.currency)}</span>
              <span className="text-slate-500 dark:text-slate-400"> / night</span>
            </div>
            <a
              href="#reserve"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 dark:bg-slate-50 dark:text-slate-900"
            >
              Reserve Now
            </a>
          </div>
        </div>

        {/* Similar listings */}
        <section className="mt-16 border-t border-slate-200/50 pb-20 pt-10 lg:pb-10 dark:border-slate-800/50">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Similar places you might like</h2>
          <SimilarListings listings={similarListings} />
        </section>
      </main>

      {/* Structured data for SEO. Safe: contents are JSON.stringify-encoded server-controlled fields. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LodgingBusiness',
            name: listing.title,
            description: listing.description.slice(0, 300),
            image: listing.images.map((img) => img.url),
            address: {
              '@type': 'PostalAddress',
              streetAddress: listing.location.address,
              addressLocality: listing.location.city,
              addressRegion: listing.location.state,
              addressCountry: listing.location.country,
            },
            geo: {
              '@type': 'GeoCoordinates',
              latitude: listing.location.lat,
              longitude: listing.location.lng,
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: listing.rating,
              reviewCount: listing.reviewCount,
              bestRating: 5,
            },
            priceRange: `${formatPrice(listing.pricePerNight, listing.currency)} per night`,
            amenityFeature: listing.amenities.map((a) => ({
              '@type': 'LocationFeatureSpecification',
              name: a,
              value: true,
            })),
            numberOfRooms: listing.bedrooms,
            petsAllowed: listing.amenities.includes('pet-friendly'),
          }),
        }}
      />
    </>
  );
}
