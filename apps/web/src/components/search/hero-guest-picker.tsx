'use client';

import { Minus, Plus, Users } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

const FALLBACK_MAX = 16;

type CapacityResponse = {
  max: number;
  total: number;
  buckets: { guests: number; count: number }[];
};

export function HeroGuestPicker() {
  const [guests, setGuests] = useState(1);
  const [open, setOpen] = useState(false);
  const [capacity, setCapacity] = useState<CapacityResponse | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/listings/capacity', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CapacityResponse | null) => {
        if (!cancelled && data && typeof data.max === 'number') setCapacity(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const max = capacity?.max && capacity.max > 0 ? capacity.max : FALLBACK_MAX;
  const total = capacity?.total ?? 0;
  const matching = capacity?.buckets.find((b) => b.guests === guests)?.count ?? total;

  const triggerLabel = `${guests} ${guests === 1 ? 'guest' : 'guests'}`;

  const helper = capacity
    ? `${matching} ${matching === 1 ? 'property fits' : 'properties fit'} ${guests}+`
    : 'Loading availability…';

  return (
    <div
      ref={containerRef}
      className="relative flex w-56 flex-shrink-0 flex-col items-start px-6 py-2"
    >
      <span
        id={labelId}
        className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
      >
        Who
      </span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full truncate text-left text-sm font-medium text-slate-900 focus:outline-none"
      >
        {triggerLabel}
      </button>
      <input type="hidden" name="guests" value={String(guests)} />

      {open && (
        <div
          role="dialog"
          aria-label="Select number of guests"
          className="absolute left-0 top-full z-[60] mt-3 w-80 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <Users className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Guests</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Up to {max} per stay
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                aria-label="Decrease guests"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-900">
                {guests}
              </span>
              <button
                type="button"
                onClick={() => setGuests((g) => Math.min(max, g + 1))}
                disabled={guests >= max}
                aria-label="Increase guests"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">{helper}</p>
            {matching === 0 && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                No published properties fit this group size right now.
              </p>
            )}
            {guests >= max && max > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                Largest current property hosts {max}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
