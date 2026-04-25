import { Skeleton } from '@lumina/ui';

export function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 pt-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Title skeleton */}
      <div className="mb-8">
        <div className="mb-2 flex gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="mb-2 h-12 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>

      {/* Gallery skeleton — bento grid */}
      <div className="mb-12 grid h-[600px] grid-cols-4 grid-rows-2 gap-2">
        <Skeleton className="col-span-2 row-span-2 rounded-l-2xl" />
        <Skeleton className="" />
        <Skeleton className="rounded-tr-2xl" />
        <Skeleton className="" />
        <Skeleton className="rounded-br-2xl" />
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_380px]">
        <div className="space-y-12">
          {/* Specs */}
          <div className="flex gap-8 border-b border-slate-200/50 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <Skeleton className="mb-4 h-8 w-48" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <Skeleton className="mb-6 h-8 w-56" />
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div>
            <Skeleton className="mb-6 h-8 w-40" />
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="hidden lg:block">
          <div className="sticky top-28 space-y-6 rounded-2xl border border-slate-200/50 bg-white p-8 shadow-[0px_20px_40px_-10px_rgba(3,7,18,0.06)] dark:border-slate-800/50 dark:bg-slate-900">
            <div className="flex items-end justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-12" />
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-700">
                <Skeleton className="h-16 rounded-none border-r border-slate-200 dark:border-slate-700" />
                <Skeleton className="h-16 rounded-none" />
              </div>
              <Skeleton className="h-16 rounded-none" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
