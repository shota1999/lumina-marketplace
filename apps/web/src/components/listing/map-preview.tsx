'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { ExternalLink, MapPin } from 'lucide-react';
import { useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl';
import MapGL, { Marker, NavigationControl } from 'react-map-gl';

import { Button } from '@lumina/ui';

interface MapPreviewProps {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  country: string;
}

export function MapPreview({ lat, lng, address, city, state, country }: MapPreviewProps) {
  const mapboxToken = process.env['NEXT_PUBLIC_MAPBOX_TOKEN'];
  const mapRef = useRef<MapRef | null>(null);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const handleLoad = useCallback(() => {
    // Slight delay to ensure the marker is visible after load
    const map = mapRef.current?.getMap?.();
    if (map) {
      map.resize();
    }
  }, []);

  // Fallback if no token
  if (!mapboxToken) {
    return (
      <div className="space-y-4">
        <div className="relative h-[400px] overflow-hidden rounded-2xl border border-slate-200/20 bg-slate-100 dark:bg-slate-800">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="animate-pulse rounded-full bg-slate-900/10 p-12 dark:bg-slate-50/10">
                <div className="h-6 w-6 rounded-full border-4 border-white bg-slate-900 shadow-lg dark:bg-slate-50" />
              </div>
            </div>
          </div>
        </div>
        <LocationFooter address={address} city={city} state={state} country={country} mapsUrl={mapsUrl} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative h-[400px] overflow-hidden rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
        <MapGL
          ref={mapRef}
          initialViewState={{
            latitude: lat,
            longitude: lng,
            zoom: 13,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={mapboxToken}
          onLoad={handleLoad}
          scrollZoom={false}
          attributionControl={false}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <Marker longitude={lng} latitude={lat} anchor="bottom">
            <div className="relative flex flex-col items-center">
              {/* Pulse ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="h-16 w-16 animate-ping rounded-full bg-primary/10" />
              </div>
              {/* Pin */}
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20">
                <MapPin className="h-5 w-5" />
              </div>
              {/* Arrow tip */}
              <div className="h-2 w-2 -mt-1 rotate-45 bg-primary" />
            </div>
          </Marker>
        </MapGL>
      </div>

      <LocationFooter address={address} city={city} state={state} country={country} mapsUrl={mapsUrl} />
    </div>
  );
}

function LocationFooter({
  address,
  city,
  state,
  country,
  mapsUrl,
}: {
  address: string;
  city: string;
  state: string;
  country: string;
  mapsUrl: string;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{city}, {state}</p>
        <p className="text-slate-500 dark:text-slate-400">
          {address ? `${address}. ` : ''}Exact location provided after booking.
        </p>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" asChild>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Maps
        </a>
      </Button>
    </div>
  );
}
