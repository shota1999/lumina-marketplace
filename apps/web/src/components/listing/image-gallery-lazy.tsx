'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@lumina/ui';

export const ImageGalleryLazy = dynamic(
  () => import('@/components/listing/image-gallery').then((m) => m.ImageGallery),
  {
    loading: () => (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        <Skeleton className="col-span-1 row-span-1 aspect-[4/3] rounded-2xl sm:col-span-2 lg:row-span-2 lg:min-h-[400px]" />
        <Skeleton className="hidden aspect-[4/3] rounded-2xl sm:block" />
        <Skeleton className="hidden aspect-[4/3] rounded-2xl sm:block" />
        <Skeleton className="hidden aspect-[4/3] rounded-2xl sm:block" />
        <Skeleton className="hidden aspect-[4/3] rounded-2xl sm:block" />
      </div>
    ),
    ssr: false,
  },
);
