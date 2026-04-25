'use client';

import { ChevronLeft, ChevronRight, Grid, ImageOff, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import type { ListingImage } from '@lumina/shared';
import { Button } from '@lumina/ui';

function ImageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
      <ImageOff className="h-8 w-8 text-slate-400" />
    </div>
  );
}

function GalleryImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [error, setError] = useState(false);
  if (error) return <ImageFallback />;
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setError(true)}
    />
  );
}

export interface ImageGalleryProps {
  images: ListingImage[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const primary = images.find((img) => img.isPrimary) ?? images[0];
  const secondary = images.filter((img) => img.id !== primary?.id).slice(0, 4);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((prev) => (prev + dir + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, navigate]);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  // Choose a grid template based on how many images we have, so the canvas
  // is always filled (no blank cells when a host uploads only 1–4 photos).
  const count = images.length;
  let gridLayout: {
    container: string;
    primary: string;
    secondary: (i: number, total: number) => string;
  };

  if (count <= 1) {
    gridLayout = {
      container: 'grid h-[420px] grid-cols-1 gap-2 md:h-[520px]',
      primary: 'relative cursor-pointer overflow-hidden rounded-2xl',
      secondary: () => '',
    };
  } else if (count === 2) {
    gridLayout = {
      container: 'grid h-[420px] grid-cols-1 gap-2 sm:grid-cols-2 md:h-[520px]',
      primary:
        'relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-r-none sm:rounded-l-2xl',
      secondary: () =>
        'relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-l-none sm:rounded-r-2xl',
    };
  } else if (count === 3) {
    gridLayout = {
      container:
        'grid h-[420px] grid-cols-1 grid-rows-1 gap-2 sm:grid-cols-2 sm:grid-rows-2 md:h-[520px]',
      primary:
        'relative cursor-pointer overflow-hidden rounded-2xl sm:row-span-2 sm:rounded-r-none sm:rounded-l-2xl',
      secondary: (i) =>
        `relative hidden cursor-pointer overflow-hidden sm:block ${
          i === 0 ? 'sm:rounded-tr-2xl' : 'sm:rounded-br-2xl'
        }`,
    };
  } else {
    // 5+ photos: cinematic asymmetric layout — primary takes 3/5 (60%) width.
    //   ┌──────────────────┬─────────┐
    //   │                  │    2    │
    //   │                  ├─────────┤
    //   │        1         │    3    │
    //   │                  ├────┬────┤
    //   │                  │ 4  │ 5  │
    //   └──────────────────┴────┴────┘
    gridLayout = {
      container:
        'grid h-[500px] grid-cols-1 grid-rows-1 gap-2 sm:grid-cols-5 sm:grid-rows-3 md:h-[620px]',
      primary:
        'relative cursor-pointer overflow-hidden rounded-2xl sm:col-span-3 sm:row-span-3 sm:rounded-none sm:rounded-l-2xl',
      secondary: (i) => {
        const base = 'relative hidden cursor-pointer overflow-hidden sm:block';
        if (i === 0) return `${base} sm:col-span-2 sm:row-span-1 sm:rounded-tr-2xl`;
        if (i === 1) return `${base} sm:col-span-2 sm:row-span-1`;
        if (i === 2) return `${base} sm:col-span-1 sm:row-span-1`;
        if (i === 3) return `${base} sm:col-span-1 sm:row-span-1 sm:rounded-br-2xl`;
        return base + ' sm:hidden'; // any extras don't render in the grid
      },
    };
  }

  return (
    <>
      <div className={`relative ${gridLayout.container}`}>
        {primary && (
          <button
            type="button"
            className={gridLayout.primary}
            onClick={() => openLightbox(0)}
          >
            <GalleryImage
              src={primary.url}
              alt={primary.alt || title}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
          </button>
        )}

        {secondary.map((img, i) => (
          <button
            key={img.id}
            type="button"
            className={gridLayout.secondary(i, secondary.length)}
            onClick={() => openLightbox(i + 1)}
          >
            <GalleryImage
              src={img.url}
              alt={img.alt || `${title} photo ${i + 2}`}
              fill
              sizes={count <= 2 ? '50vw' : '25vw'}
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
          </button>
        ))}

        {/* "Show all photos" button — top-of-stack so it floats over the grid */}
        {count > 1 && (
          <button
            type="button"
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold shadow-xl transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
            onClick={() => openLightbox(0)}
          >
            <Grid className="h-4 w-4" />
            {count > 5 ? 'Show all photos' : `${count} photos`}
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-label="Image gallery">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-medium">
              {activeIndex + 1} / {images.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Main image — fills available space, near-full-screen */}
          <div className="relative flex flex-1 items-center justify-center px-4 sm:px-12">
            <div className="relative h-full w-full max-w-[1600px]">
              <GalleryImage
                src={images[activeIndex]!.url}
                alt={images[activeIndex]!.alt || `${title} photo ${activeIndex + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1600px) 90vw, 1600px"
                className="rounded-lg object-contain"
                priority
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              onClick={() => navigate(1)}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Thumbnail strip */}
          <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md transition-opacity ${
                  i === activeIndex ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-80'
                }`}
                onClick={() => setActiveIndex(i)}
              >
                <GalleryImage
                  src={img.url}
                  alt={img.alt || `Thumbnail ${i + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
