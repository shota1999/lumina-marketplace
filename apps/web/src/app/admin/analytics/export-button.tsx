'use client';

import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: { type: string; label: string; count: number }[];
}

export function ExportButton({ data }: ExportButtonProps) {
  function handleExport() {
    const header = 'Event Type,Label,Count';
    const rows = data.map((d) => `${d.type},${d.label},${d.count}`);
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700"
    >
      <Download className="h-4 w-4" />
      Export
    </button>
  );
}
