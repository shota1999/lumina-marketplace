export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex gap-6" style={{ minHeight: "calc(100vh - 12rem)" }}>
        {/* Sidebar list */}
        <div className="w-80 flex-shrink-0 space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-3">
              {/* Avatar */}
              <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              {/* Name + preview */}
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col rounded-xl border border-slate-200 p-6 dark:border-slate-800">
          <div className="mb-6 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1 space-y-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="mt-6 h-12 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
