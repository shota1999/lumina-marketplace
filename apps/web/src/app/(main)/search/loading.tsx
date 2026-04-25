export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Search bar placeholder */}
      <div className="mb-8 h-12 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />

      {/* Grid of 6 card skeletons */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <div className="aspect-[4/3] animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
