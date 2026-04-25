'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { Layers, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl';
import MapGL, { Marker, NavigationControl, Popup } from 'react-map-gl';
import Supercluster from 'supercluster';

import type { Listing } from '@lumina/shared';
import { formatPrice } from '@lumina/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Bounds = { north: number; south: number; east: number; west: number };

interface ListingMapProps {
  listings: Listing[];
  onBoundsChange?: (bounds: Bounds) => void;
  highlightedId?: string | null;
  onMarkerClick?: (listing: Listing) => void;
  onMarkerHover?: (id: string | null) => void;
  /** If true, show "Search this area" button when map moves */
  searchThisArea?: boolean;
  onSearchArea?: (bounds: Bounds) => void;
}

type PointFeature = GeoJSON.Feature<GeoJSON.Point, { listing: Listing }>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listingsToFeatures(listings: Listing[]): PointFeature[] {
  return listings
    .filter((l) => l.location.lat && l.location.lng)
    .map((listing) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [listing.location.lng, listing.location.lat],
      },
      properties: { listing },
    }));
}

function getBoundsFromListings(listings: Listing[]): Bounds | null {
  const valid = listings.filter((l) => l.location.lat && l.location.lng);
  if (valid.length === 0) return null;
  let north = -90,
    south = 90,
    east = -180,
    west = 180;
  for (const l of valid) {
    if (l.location.lat > north) north = l.location.lat;
    if (l.location.lat < south) south = l.location.lat;
    if (l.location.lng > east) east = l.location.lng;
    if (l.location.lng < west) west = l.location.lng;
  }
  return { north, south, east, west };
}

// ---------------------------------------------------------------------------
// Map styles
// ---------------------------------------------------------------------------

const MAP_STYLES = {
  streets: { label: 'Streets', url: 'mapbox://styles/mapbox/light-v11' },
  dark: { label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  satellite: { label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
} as const;

type MapStyleKey = keyof typeof MAP_STYLES;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ListingMap({
  listings,
  onBoundsChange,
  highlightedId,
  onMarkerClick,
  onMarkerHover,
  searchThisArea = false,
  onSearchArea,
}: ListingMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [viewState, setViewState] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 4,
  });
  const [mapZoom, setMapZoom] = useState(4);
  const [mapBounds, setMapBounds] = useState<
    [number, number, number, number] | null
  >(null);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('streets');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const hasFittedRef = useRef(false);
  const listingsKeyRef = useRef('');
  const mapboxToken = process.env['NEXT_PUBLIC_MAPBOX_TOKEN'];

  // ---- Supercluster ----
  const features = useMemo(() => listingsToFeatures(listings), [listings]);

  const cluster = useMemo(() => {
    const sc = new Supercluster<{ listing: Listing }>({
      radius: 60,
      maxZoom: 16,
    });
    sc.load(features);
    return sc;
  }, [features]);

  const clusters = useMemo(() => {
    if (!mapBounds) return [];
    return cluster.getClusters(mapBounds, Math.floor(mapZoom));
  }, [cluster, mapBounds, mapZoom]);

  // ---- Fit bounds when listings change ----
  useEffect(() => {
    const key = listings.map((l) => l.id).sort().join(',');
    if (key === listingsKeyRef.current) return;
    listingsKeyRef.current = key;
    hasFittedRef.current = false;
  }, [listings]);

  useEffect(() => {
    if (hasFittedRef.current) return;
    if (!mapRef.current) return;
    const bounds = getBoundsFromListings(listings);
    if (!bounds) return;

    const map = mapRef.current.getMap?.();
    if (!map) return;

    // Pad single-point results
    const latPad = bounds.north === bounds.south ? 0.5 : 0;
    const lngPad = bounds.east === bounds.west ? 0.5 : 0;

    map.fitBounds(
      [
        [bounds.west - lngPad, bounds.south - latPad],
        [bounds.east + lngPad, bounds.north + latPad],
      ],
      { padding: 60, duration: 800, maxZoom: 14 },
    );
    hasFittedRef.current = true;
    setShowSearchButton(false);
  }, [listings, clusters]); // clusters dep forces re-eval after map loads

  // ---- Map event handlers ----
  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setViewState(evt.viewState);
    },
    [],
  );

  const handleMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      const map = evt.target;
      const b = map?.getBounds?.();
      if (!b) return;
      const bounds: Bounds = {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      };
      setMapBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setMapZoom(map.getZoom());
      onBoundsChange?.(bounds);
    },
    [onBoundsChange],
  );

  const handleUserInteraction = useCallback(() => {
    if (searchThisArea && hasFittedRef.current) {
      setShowSearchButton(true);
    }
  }, [searchThisArea]);

  const handleSearchArea = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !onSearchArea) return;
    const b = map.getBounds();
    if (!b) return;
    onSearchArea({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
    setShowSearchButton(false);
  }, [onSearchArea]);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    setMapBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    setMapZoom(map.getZoom());
  }, []);

  // ---- Click on cluster → zoom in ----
  const handleClusterClick = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      const zoom = cluster.getClusterExpansionZoom(clusterId);
      mapRef.current?.getMap?.().flyTo({
        center: [lng, lat],
        zoom: Math.min(zoom, 16),
        duration: 500,
      });
    },
    [cluster],
  );

  // ---- Click on single marker ----
  const handlePointClick = useCallback(
    (listing: Listing) => {
      setSelected(listing);
      onMarkerClick?.(listing);
    },
    [onMarkerClick],
  );

  // ---- No token fallback ----
  if (!mapboxToken) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">
          Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onDragEnd={handleUserInteraction}
        onZoomEnd={handleUserInteraction}
        onLoad={handleLoad}
        style={{ width: '100%', height: '100%', minHeight: 400, borderRadius: 8 }}
        mapStyle={MAP_STYLES[mapStyle].url}
        mapboxAccessToken={mapboxToken}
      >
        <NavigationControl position="top-right" />

        {/* Render clusters & markers */}
        {clusters.map((feature) => {
          const coords = feature.geometry.coordinates;
          const lng = coords[0] as number;
          const lat = coords[1] as number;
          const props = feature.properties;

          // Cluster
          if (props && 'cluster' in props && props.cluster) {
            const count = (props as { point_count: number }).point_count;
            const id = (props as { cluster_id: number }).cluster_id;
            return (
              <ClusterMarker
                key={`cluster-${id}`}
                lng={lng}
                lat={lat}
                count={count}
                onClick={() => handleClusterClick(id, lng, lat)}
              />
            );
          }

          // Single point
          const listing = (props as { listing: Listing }).listing;
          const isHighlighted = highlightedId === listing.id;
          const isSelected = selected?.id === listing.id;

          return (
            <PriceMarker
              key={listing.id}
              listing={listing}
              lng={lng}
              lat={lat}
              isHighlighted={isHighlighted}
              isSelected={isSelected}
              onClick={() => handlePointClick(listing)}
              onMouseEnter={() => onMarkerHover?.(listing.id)}
              onMouseLeave={() => onMarkerHover?.(null)}
            />
          );
        })}

        {/* Popup */}
        {selected && (
          <Popup
            latitude={selected.location.lat}
            longitude={selected.location.lng}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            offset={28}
            className="listing-popup"
            maxWidth="280px"
          >
            <ListingPopup listing={selected} />
          </Popup>
        )}
      </MapGL>

      {/* Search this area button */}
      {showSearchButton && searchThisArea && (
        <button
          onClick={handleSearchArea}
          className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold shadow-lg transition-all hover:bg-accent hover:shadow-xl active:scale-95"
        >
          Search this area
        </button>
      )}

      {/* Map style toggle */}
      <div className="absolute bottom-6 left-3 z-10">
        {showStylePicker ? (
          <div className="flex gap-1 rounded-xl border border-border bg-background p-1 shadow-lg">
            {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setMapStyle(key);
                  setShowStylePicker(false);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  mapStyle === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {MAP_STYLES[key].label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setShowStylePicker(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground shadow-md transition-all hover:bg-accent hover:text-foreground"
          >
            <Layers className="h-3.5 w-3.5" />
            {MAP_STYLES[mapStyle].label}
          </button>
        )}
      </div>

      {/* Listing count badge */}
      {listings.length > 0 && (
        <div className="absolute bottom-6 right-3 z-10 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-md">
          {listings.length} listing{listings.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Empty state overlay */}
      {listings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="rounded-lg bg-background p-6 text-center shadow-lg">
            <p className="mb-1 font-medium">No listings in this area</p>
            <p className="text-sm text-muted-foreground">
              Try zooming out or adjusting your filters
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PriceMarker({
  listing,
  lng,
  lat,
  isHighlighted,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  listing: Listing;
  lng: number;
  lat: number;
  isHighlighted: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const active = isHighlighted || isSelected;

  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          map-marker-enter group/marker relative flex items-center rounded-full px-2.5 py-1 text-xs font-bold
          shadow-md transition-all duration-200 cursor-pointer select-none border
          ${
            active
              ? 'bg-primary text-primary-foreground scale-110 shadow-lg z-10 ring-2 ring-primary/30 border-primary'
              : 'bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-110 hover:shadow-lg border-border/50'
          }
        `}
        style={{ whiteSpace: 'nowrap' }}
      >
        {formatPrice(listing.pricePerNight, listing.currency)}
        {/* Arrow */}
        <span
          className={`absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r ${
            active ? 'bg-primary border-primary' : 'bg-background border-border/50 group-hover/marker:bg-primary group-hover/marker:border-primary'
          }`}
        />
      </button>
    </Marker>
  );
}

function ClusterMarker({
  lng,
  lat,
  count,
  onClick,
}: {
  lng: number;
  lat: number;
  count: number;
  onClick: () => void;
}) {
  // Scale size with count
  const size = Math.min(24 + Math.log2(count) * 8, 56);

  return (
    <Marker longitude={lng} latitude={lat}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="map-marker-enter cluster-marker-pulse flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg transition-transform hover:scale-110 cursor-pointer border-2 border-primary-foreground/20"
        style={{ width: size, height: size, fontSize: size > 40 ? 14 : 12 }}
      >
        {count}
      </button>
    </Marker>
  );
}

function ListingPopup({ listing }: { listing: Listing }) {
  const primaryImage =
    listing.images.find((img) => img.isPrimary) ?? listing.images[0];

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="block w-[260px] overflow-hidden rounded-lg no-underline"
    >
      {primaryImage && (
        <div className="relative h-[140px] w-full overflow-hidden">
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt || listing.title}
            fill
            sizes="260px"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-3">
        <h4 className="mb-0.5 line-clamp-1 text-sm font-semibold text-foreground">
          {listing.title}
        </h4>
        <p className="mb-1.5 text-xs text-muted-foreground">
          {listing.location.city}
          {listing.location.state ? `, ${listing.location.state}` : ''}
          {listing.location.country ? `, ${listing.location.country}` : ''}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {formatPrice(listing.pricePerNight, listing.currency)}
            <span className="font-normal text-muted-foreground"> / night</span>
          </span>
          {listing.rating > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(listing.rating).toFixed(1)}
              {listing.reviewCount > 0 && (
                <span className="ml-0.5">({listing.reviewCount})</span>
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
