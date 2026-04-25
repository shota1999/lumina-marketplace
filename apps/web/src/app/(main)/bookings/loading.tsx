export default function BookingsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Heading */}
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

      {/* 4 horizontal card skeletons */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 overflow-hidden rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            {/* Small image left */}
            <div className="h-24 w-32 flex-shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            {/* Text right */}
            <div className="flex flex-1 flex-col justify-center space-y-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
