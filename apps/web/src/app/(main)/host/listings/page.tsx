'use client';

import {
  Bath,
  Bed,
  ExternalLink,
  ImageOff,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { formatPrice } from '@lumina/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
  Textarea,
} from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface HostListing {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  pricePerNight: number;
  currency: string;
  city: string;
  country: string;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  primaryImage: string | null;
  createdAt: string;
}

const CATEGORIES = [
  'villa', 'apartment', 'cabin', 'treehouse', 'boat', 'castle', 'farmhouse', 'penthouse',
] as const;

const AMENITY_OPTIONS = [
  'wifi', 'pool', 'hot-tub', 'kitchen', 'parking', 'air-conditioning',
  'gym', 'fireplace', 'washer', 'dryer', 'balcony', 'garden',
  'beach-access', 'ski-in', 'pet-friendly', 'ev-charger',
];

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function ListingCard({ listing }: { listing: HostListing }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-square sm:w-44">
          {listing.primaryImage ? (
            <Image
              src={listing.primaryImage}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 176px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <Link href={`/listings/${listing.slug}`} className="font-semibold hover:underline">
                  {listing.title}
                </Link>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {listing.city}, {listing.country}
                </p>
              </div>
              <Badge className={statusColors[listing.status] ?? ''}>
                {listing.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatPrice(listing.pricePerNight, listing.currency)}<span className="font-normal text-muted-foreground"> /night</span>
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {listing.rating.toFixed(1)} ({listing.reviewCount})
              </span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{listing.maxGuests}</span>
              <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{listing.bedrooms}</span>
              <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{listing.bathrooms}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Listed {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/listings/${listing.slug}`}>
                <ExternalLink className="mr-1.5 h-3 w-3" />
                View
              </Link>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default function HostListingsPage() {
  const [listings, setListings] = useState<HostListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Create listing form
  const [creating, setCreating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'villa' as string,
    pricePerNight: '',
    currency: 'USD',
    address: '',
    city: '',
    state: '',
    country: '',
    lat: '',
    lng: '',
    maxGuests: '4',
    bedrooms: '2',
    bathrooms: '1',
    amenities: [] as string[],
  });

  useEffect(() => {
    fetch('/api/listings/mine')
      .then((r) => {
        if (r.status === 401) { setError('UNAUTHORIZED'); return null; }
        return r.json();
      })
      .then((data) => {
        if (data?.success) setListings(data.data);
      })
      .catch(() => setError('Failed to load listings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        pricePerNight: Number(form.pricePerNight),
        currency: form.currency,
        location: {
          address: form.address,
          city: form.city,
          state: form.state,
          country: form.country,
          lat: Number(form.lat) || 0,
          lng: Number(form.lng) || 0,
        },
        maxGuests: Number(form.maxGuests),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        amenities: form.amenities,
      };

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({ title: 'Create failed', description: data.error?.message ?? 'Something went wrong', variant: 'destructive' });
        return;
      }

      toast({ title: 'Listing created', description: 'Your new listing is now live' });
      // Add to local state
      setListings((prev) => [{
        id: data.data.id,
        title: data.data.title,
        slug: data.data.slug,
        category: data.data.category,
        status: data.data.status,
        pricePerNight: Number(data.data.pricePerNight),
        currency: data.data.currency,
        city: data.data.city,
        country: data.data.country,
        rating: 0,
        reviewCount: 0,
        maxGuests: data.data.maxGuests,
        bedrooms: data.data.bedrooms,
        bathrooms: data.data.bathrooms,
        primaryImage: null,
        createdAt: data.data.createdAt,
      }, ...prev]);
      setShowForm(false);
      setForm({
        title: '', description: '', category: 'villa', pricePerNight: '', currency: 'USD',
        address: '', city: '', state: '', country: '', lat: '', lng: '',
        maxGuests: '4', bedrooms: '2', bathrooms: '1', amenities: [],
      });
    } catch {
      toast({ title: 'Network error', description: 'Could not create listing', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateDescription() {
    if (!form.title || form.title.length < 3) {
      toast({ title: 'Title required', description: 'Enter a title before generating a description', variant: 'destructive' });
      return;
    }
    if (!form.city || !form.country) {
      toast({ title: 'Location required', description: 'Enter city and country before generating', variant: 'destructive' });
      return;
    }

    setGeneratingAI(true);
    setForm((prev) => ({ ...prev, description: '' }));

    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          city: form.city,
          state: form.state || 'N/A',
          country: form.country,
          amenities: form.amenities,
          maxGuests: Number(form.maxGuests),
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          pricePerNight: form.pricePerNight ? Number(form.pricePerNight) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: 'Generation failed', description: err.error?.message ?? 'Try again later', variant: 'destructive' });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let description = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        description += decoder.decode(value, { stream: true });
        setForm((prev) => ({ ...prev, description }));
      }

      toast({ title: 'Description generated', description: 'Review and edit as needed' });
    } catch {
      toast({ title: 'Generation failed', description: 'Could not connect to AI service', variant: 'destructive' });
    } finally {
      setGeneratingAI(false);
    }
  }

  if (error === 'UNAUTHORIZED') {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <Users className="mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Host access required</h1>
        <p className="mb-6 text-muted-foreground">
          You need a host account to manage listings.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/host">Learn about hosting</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {listings.length} listing{listings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          New listing
        </Button>
      </div>

      {/* Create listing form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create a new listing</CardTitle>
            <CardDescription>Fill in the details to list your property</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Basic info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Beautiful Beachfront Villa"
                    required
                    minLength={5}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Description</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleGenerateDescription}
                      disabled={generatingAI}
                    >
                      {generatingAI ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {generatingAI ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe your property in detail..."
                    required
                    minLength={20}
                    rows={6}
                  />
                  {generatingAI && (
                    <p className="text-xs text-muted-foreground">
                      AI is writing your description. You can edit it when it&apos;s done.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price per night ($)</label>
                  <Input
                    type="number"
                    value={form.pricePerNight}
                    onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                    placeholder="250"
                    required
                    min={1}
                    max={100000}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">Location</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="123 Ocean Drive"
                      required
                      minLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Latitude</label>
                      <Input
                        type="number"
                        step="any"
                        value={form.lat}
                        onChange={(e) => setForm({ ...form, lat: e.target.value })}
                        placeholder="34.0195"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Longitude</label>
                      <Input
                        type="number"
                        step="any"
                        value={form.lng}
                        onChange={(e) => setForm({ ...form, lng: e.target.value })}
                        placeholder="-118.4912"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Property details */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">Property details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max guests</label>
                    <Input
                      type="number"
                      value={form.maxGuests}
                      onChange={(e) => setForm({ ...form, maxGuests: e.target.value })}
                      min={1}
                      max={50}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bedrooms</label>
                    <Input
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                      min={0}
                      max={30}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bathrooms</label>
                    <Input
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                      min={0}
                      max={20}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h4 className="mb-3 text-sm font-semibold">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((a) => {
                    const selected = form.amenities.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            amenities: selected
                              ? form.amenities.filter((x) => x !== a)
                              : [...form.amenities, a],
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        {a.replace(/-/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" /> Create listing</>
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listings */}
      {listings.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <Plus className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">No listings yet</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Create your first listing to start welcoming guests to your property.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first listing
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
