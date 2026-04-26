'use client';

import { Calendar, ChevronLeft, ChevronRight, Loader2, Lock, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Block {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatMonth(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/** Build a lookup: dateStr -> Block for every day covered by any block. */
function buildBlockMap(blocks: Block[]) {
  const map = new Map<string, Block>();
  for (const block of blocks) {
    const [sy, sm, sd] = block.startDate.split('-').map(Number) as [number, number, number];
    const [ey, em, ed] = block.endDate.split('-').map(Number) as [number, number, number];
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
      map.set(key, block);
    }
  }
  return map;
}

function dateStrInRange(dateStr: string, start: string, end: string) {
  return dateStr >= start && dateStr <= end;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;

  // Calendar navigation
  const now = useMemo(() => new Date(), []);
  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  // Data
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Deleting
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derived
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const blockMap = useMemo(() => buildBlockMap(blocks), [blocks]);

  // ---------------------------------------------------------------------------
  // Fetch blocks
  // ---------------------------------------------------------------------------

  const fetchBlocks = useCallback(async () => {
    if (!listingId) return;
    try {
      const res = await fetch(`/api/host/listings/${listingId}/blocks`);
      const data = await res.json();
      if (data?.success) {
        setBlocks(data.data ?? []);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load availability blocks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Calendar grid cells
  // ---------------------------------------------------------------------------

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // ---------------------------------------------------------------------------
  // Selection logic
  // ---------------------------------------------------------------------------

  function resetSelection() {
    setSelectedStart(null);
    setSelectedEnd(null);
    setHoverDate(null);
    setShowModal(false);
    setReason('');
  }

  function handleDayClick(dateStr: string) {
    // If the date is blocked, offer to delete
    const existingBlock = blockMap.get(dateStr);
    if (existingBlock) {
      handleDeleteBlock(existingBlock);
      return;
    }

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start a new selection
      setSelectedStart(dateStr);
      setSelectedEnd(null);
      setHoverDate(null);
    } else {
      // Complete the range
      const start = dateStr < selectedStart ? dateStr : selectedStart;
      const end = dateStr < selectedStart ? selectedStart : dateStr;
      setSelectedStart(start);
      setSelectedEnd(end);
      setShowModal(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Create block
  // ---------------------------------------------------------------------------

  async function handleCreateBlock() {
    if (!selectedStart || !selectedEnd || !listingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/host/listings/${listingId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: selectedStart,
          endDate: selectedEnd,
          reason: reason.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Failed to block dates',
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Dates blocked', description: `${selectedStart} to ${selectedEnd}` });
      setBlocks((prev) => [...prev, data.data]);
      resetSelection();
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not block dates',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete block
  // ---------------------------------------------------------------------------

  async function handleDeleteBlock(block: Block) {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Remove block from ${block.startDate} to ${block.endDate}?${block.reason ? ` Reason: ${block.reason}` : ''}`,
    );
    if (!confirmed) return;

    setDeletingId(block.id);
    try {
      const res = await fetch(`/api/host/listings/${listingId}/blocks/${block.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Failed to remove block',
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Block removed' });
      setBlocks((prev) => prev.filter((b) => b.id !== block.id));
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not remove block',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Cell styling
  // ---------------------------------------------------------------------------

  function getCellClasses(dateStr: string) {
    const isToday = dateStr === todayStr;
    const isBlocked = blockMap.has(dateStr);
    const isStart = dateStr === selectedStart;
    const effectiveEnd = selectedEnd ?? hoverDate;
    const inRange =
      selectedStart && effectiveEnd && !isBlocked
        ? dateStrInRange(
            dateStr,
            selectedStart < effectiveEnd ? selectedStart : effectiveEnd,
            selectedStart < effectiveEnd ? effectiveEnd : selectedStart,
          )
        : false;

    let base =
      'relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-all cursor-pointer ';

    if (isBlocked) {
      base +=
        'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-600 ';
    } else if (inRange || isStart) {
      base += 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ';
    } else {
      base += 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ';
    }

    if (isToday && !isBlocked && !inRange && !isStart) {
      base += 'ring-2 ring-slate-400 dark:ring-slate-500 ';
    }

    return base.trim();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <div className="mb-2 h-8 w-56 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mb-8 h-5 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Availability Calendar
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Click dates to select a range and block them. Click a blocked date to remove its block.
        </p>
      </div>

      {/* Calendar Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        {/* Month Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatMonth(currentYear, currentMonth)}
          </h2>
          <button
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="flex h-10 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-10 w-10" />;
            }

            const dateStr = toDateStr(currentYear, currentMonth, day);
            const isBlocked = blockMap.has(dateStr);

            return (
              <div key={dateStr} className="flex items-center justify-center">
                <button
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => {
                    if (selectedStart && !selectedEnd) setHoverDate(dateStr);
                  }}
                  className={getCellClasses(dateStr)}
                  title={
                    isBlocked
                      ? `Blocked${blockMap.get(dateStr)?.reason ? `: ${blockMap.get(dateStr)!.reason}` : ''} — click to remove`
                      : undefined
                  }
                >
                  {day}
                  {isBlocked && (
                    <Lock className="absolute -right-0.5 -top-0.5 h-3 w-3 text-slate-500 dark:text-slate-400" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Legend
          </span>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-slate-300 dark:bg-slate-700" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-slate-900 dark:bg-slate-100" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm ring-2 ring-slate-400 dark:ring-slate-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Today</span>
          </div>
        </div>
      </div>

      {/* Selection indicator (when selecting but modal not yet open) */}
      {selectedStart && !showModal && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-5 py-3 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <Lock className="h-4 w-4 shrink-0 text-slate-500" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {selectedEnd ? (
              <>
                Selected:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {selectedStart}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {selectedEnd}
                </span>
              </>
            ) : (
              <>
                Start:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {selectedStart}
                </span>{' '}
                &mdash; click another date to complete the range
              </>
            )}
          </p>
          <button
            onClick={resetSelection}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Existing Blocks List */}
      {blocks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Active Blocks
          </h3>
          <div className="mt-3 space-y-2">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {block.startDate} &ndash; {block.endDate}
                    </p>
                    {block.reason && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {block.reason}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBlock(block)}
                  disabled={deletingId === block.id}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  {deletingId === block.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="mt-8">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Active Blocks
          </h3>
          <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <Calendar className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">No date blocks set</p>
          </div>
        </div>
      )}

      {/* Block Reason Modal */}
      {showModal && selectedStart && selectedEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Block Dates
              </h3>
              <button
                onClick={resetSelection}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Date Range
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">
                {selectedStart} &ndash; {selectedEnd}
              </p>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Personal use, maintenance, renovation..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateBlock}
                disabled={submitting}
                className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Blocking...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Block Dates
                  </>
                )}
              </Button>
              <Button
                onClick={resetSelection}
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
