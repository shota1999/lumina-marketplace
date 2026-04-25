'use client';

import { useEffect, useState } from 'react';

import {
  DateRangePicker,
  type DateRangeValue,
  toIsoDate,
} from '@/components/date-range-picker';

function formatShort(iso: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function HeroDatePicker() {
  const [value, setValue] = useState<DateRangeValue>({
    checkIn: null,
    checkOut: null,
  });
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/listings/availability', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { unavailable?: string[] } | null) => {
        if (data?.unavailable) setUnavailable(new Set(data.unavailable));
      })
      .catch(() => {});
  }, []);

  const triggerLabel = (() => {
    if (value.checkIn && value.checkOut)
      return `${formatShort(value.checkIn)} – ${formatShort(value.checkOut)}`;
    if (value.checkIn) return `${formatShort(value.checkIn)} – ?`;
    return 'Add dates';
  })();

  return (
    <div className="flex w-56 flex-shrink-0 flex-col items-start px-6 py-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        When
      </span>
      <DateRangePicker
        value={value}
        onChange={setValue}
        unavailable={unavailable}
        renderTrigger={({ open, toggleOpen, value: v }) => (
          <>
            <button
              type="button"
              onClick={toggleOpen}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={`w-full truncate text-left text-sm font-medium focus:outline-none ${
                v.checkIn ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {triggerLabel}
            </button>
            <input type="hidden" name="checkIn" value={v.checkIn ?? ''} />
            <input type="hidden" name="checkOut" value={v.checkOut ?? ''} />
          </>
        )}
      />
    </div>
  );
}

export { toIsoDate };
