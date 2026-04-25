'use client';

export function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-slate-50 dark:text-slate-900"
    >
      Try again
    </button>
  );
}
