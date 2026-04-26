export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* 4 stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
            <div className="mb-3 h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Large chart area */}
      <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-72 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
