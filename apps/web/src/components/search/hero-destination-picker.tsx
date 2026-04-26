'use client';

import { MapPin } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

type Destination = { city: string; country: string; count: number };

export function HeroDestinationPicker() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/listings/destinations', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { destinations?: Destination[] } | null) => {
        if (!cancelled && data?.destinations) setDestinations(data.destinations);
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

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return destinations.slice(0, 8);
    return destinations
      .filter((d) => d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q))
      .slice(0, 8);
  }, [destinations, value]);

  const exactMatch = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return null;
    return (
      destinations.find((d) => d.city.toLowerCase() === q || d.country.toLowerCase() === q) ?? null
    );
  }, [destinations, value]);

  const inputName = exactMatch ? 'location' : 'q';

  useEffect(() => {
    setActiveIdx(0);
  }, [value, open]);

  const select = (d: Destination) => {
    setValue(d.city);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div
      ref={containerRef}
      className="relative flex w-56 flex-shrink-0 flex-col items-start px-6 py-2"
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Where</span>
      <input
        ref={inputRef}
        name={inputName}
        type="text"
        value={value}
        autoComplete="off"
        placeholder="Search destinations"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter' && open && filtered[activeIdx]) {
            e.preventDefault();
            select(filtered[activeIdx]);
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[activeIdx] ? `${listboxId}-${activeIdx}` : undefined
        }
        className="w-full truncate border-none bg-transparent p-0 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0"
      />

      {open && filtered.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Suggested destinations"
          className="absolute left-0 top-full z-[60] mt-3 max-h-[360px] w-80 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl"
        >
          {!value.trim() && (
            <li className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Popular destinations
            </li>
          )}
          {filtered.map((d, idx) => (
            <li
              key={`${d.city}-${d.country}`}
              id={`${listboxId}-${idx}`}
              role="option"
              aria-selected={idx === activeIdx}
              onMouseEnter={() => setActiveIdx(idx)}
              onClick={(e) => {
                e.preventDefault();
                select(d);
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                idx === activeIdx ? 'bg-slate-100' : ''
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <MapPin className="h-4 w-4 text-slate-500" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{d.city}</span>
                <span className="block truncate text-xs text-slate-500">{d.country}</span>
              </span>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                {d.count} {d.count === 1 ? 'stay' : 'stays'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
