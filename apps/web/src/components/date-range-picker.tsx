'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface DateRangeValue {
  checkIn: string | null;
  checkOut: string | null;
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  unavailable?: Set<string>;
  align?: 'left' | 'right';
  months?: 1 | 2;
  renderTrigger: (args: {
    open: boolean;
    toggleOpen: () => void;
    value: DateRangeValue;
  }) => React.ReactNode;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromIsoDate(iso: string | null): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return startOfDay(new Date(y!, m! - 1, d!));
}

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DateRangePicker({
  value,
  onChange,
  unavailable,
  align = 'left',
  months: monthsCount = 2,
  renderTrigger,
}: DateRangePickerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Date | null>(null);
  const checkIn = useMemo(() => fromIsoDate(value.checkIn), [value.checkIn]);
  const checkOut = useMemo(() => fromIsoDate(value.checkOut), [value.checkOut]);

  const initialView = checkIn ?? today;
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

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

  const toggleOpen = () => setOpen((v) => !v);

  const handleDay = (date: Date) => {
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: toIsoDate(date), checkOut: null });
      return;
    }
    if (date < checkIn) {
      onChange({ checkIn: toIsoDate(date), checkOut: null });
      return;
    }
    if (sameDay(date, checkIn)) return;
    // Reject ranges that cross an unavailable day
    if (unavailable && rangeHasUnavailable(checkIn, date, unavailable)) {
      onChange({ checkIn: toIsoDate(date), checkOut: null });
      return;
    }
    onChange({ checkIn: value.checkIn, checkOut: toIsoDate(date) });
  };

  const isInRange = (date: Date) => {
    if (!checkIn) return false;
    const end = checkOut ?? hovered;
    if (!end || end < checkIn) return false;
    return date >= checkIn && date <= end;
  };

  const months = Array.from({ length: monthsCount }, (_, i) => {
    const m = viewMonth + i;
    return {
      year: viewYear + Math.floor(m / 12),
      month: ((m % 12) + 12) % 12,
    };
  });

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const popupWidth = monthsCount === 2 ? 'w-[640px]' : 'w-[320px]';
  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div ref={containerRef} className="relative">
      {renderTrigger({ open, toggleOpen, value })}

      {open && (
        <div
          role="dialog"
          aria-label="Select check-in and check-out dates"
          className={`absolute ${alignClass} top-full z-[60] mt-3 ${popupWidth} max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900`}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={viewYear === today.getFullYear() && viewMonth === today.getMonth()}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-1 items-center justify-around text-sm font-semibold text-slate-900 dark:text-slate-50">
              {months.map((m) => (
                <span key={`${m.year}-${m.month}`}>
                  {MONTH_NAMES[m.month]} {m.year}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className={`grid gap-6 ${monthsCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {months.map((m) => {
              const cells = buildMonth(m.year, m.month);
              return (
                <div key={`${m.year}-${m.month}`}>
                  <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {DAY_INITIALS.map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {cells.map((date, i) => {
                      if (!date) return <span key={i} className="h-9" />;
                      const past = date < today;
                      const blocked = unavailable?.has(toIsoDate(date)) ?? false;
                      const disabled = past || blocked;
                      const isStart = checkIn && sameDay(date, checkIn);
                      const isEnd = checkOut && sameDay(date, checkOut);
                      const inRange = isInRange(date) && !isStart && !isEnd;
                      const showDot = !disabled && !isStart && !isEnd && !inRange;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={disabled}
                          onMouseEnter={() => setHovered(date)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() => handleDay(date)}
                          aria-label={date.toDateString()}
                          aria-disabled={disabled}
                          className={`relative flex h-9 items-center justify-center text-sm transition-colors ${
                            disabled
                              ? blocked
                                ? 'text-rose-300 line-through'
                                : 'text-slate-300 line-through'
                              : isStart || isEnd
                                ? 'z-10 rounded-full bg-slate-900 font-semibold text-white dark:bg-slate-50 dark:text-slate-900'
                                : inRange
                                  ? 'bg-emerald-50 text-slate-900 dark:bg-emerald-950/40 dark:text-slate-50'
                                  : 'rounded-full text-slate-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          <span>{date.getDate()}</span>
                          {showDot && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Available
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-rose-300 line-through">15</span>
              Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-semibold text-white dark:bg-slate-50 dark:text-slate-900">
                1
              </span>
              Selected
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {checkIn && checkOut
                ? `${Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)} nights selected`
                : checkIn
                  ? 'Pick a check-out date'
                  : 'Pick a check-in date'}
            </p>
            <div className="flex gap-2">
              {(checkIn || checkOut) && (
                <button
                  type="button"
                  onClick={() => onChange({ checkIn: null, checkOut: null })}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function rangeHasUnavailable(start: Date, end: Date, unavailable: Set<string>): boolean {
  const d = new Date(start);
  d.setDate(d.getDate() + 1); // exclude start itself (already selected)
  while (d < end) {
    if (unavailable.has(toIsoDate(d))) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
}
