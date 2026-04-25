'use client';

import {
  Calendar,
  ChevronDown,
  Clock,
  Loader2,
  Moon,
  Plus,
  Sun,
  Trash2,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Card, CardContent, Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

type RuleType = 'weekend' | 'seasonal' | 'last_minute' | 'length_of_stay';

interface PricingRule {
  id: string;
  type: RuleType;
  multiplier: number;
  startDate?: string;
  endDate?: string;
  daysBeforeCheckIn?: number;
  minimumNights?: number;
  createdAt: string;
}

const RULE_META: Record<
  RuleType,
  { label: string; icon: React.ElementType; description: string }
> = {
  weekend: {
    label: 'Weekend',
    icon: Sun,
    description: 'Adjust pricing for weekend stays',
  },
  seasonal: {
    label: 'Seasonal',
    icon: Calendar,
    description: 'Set pricing for a specific date range',
  },
  last_minute: {
    label: 'Last Minute',
    icon: Clock,
    description: 'Discount for last-minute bookings',
  },
  length_of_stay: {
    label: 'Length of Stay',
    icon: Moon,
    description: 'Discount for longer reservations',
  },
};

function formatMultiplier(m: number): string {
  if (m >= 1) return `+${Math.round((m - 1) * 100)}%`;
  return `-${Math.round((1 - m) * 100)}%`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PricingRulesPage() {
  const params = useParams<{ id: string }>();
  const listingId = params.id;

  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [ruleType, setRuleType] = useState<RuleType>('weekend');
  const [multiplier, setMultiplier] = useState('1.2');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysBeforeCheckIn, setDaysBeforeCheckIn] = useState('7');
  const [minimumNights, setMinimumNights] = useState('7');

  const fetchRules = useCallback(async () => {
    if (!listingId) return;
    try {
      const res = await fetch(`/api/host/listings/${listingId}/pricing`);
      const data = await res.json();
      if (data?.success) setRules(data.data ?? []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load pricing rules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  function resetForm() {
    setRuleType('weekend');
    setMultiplier('1.2');
    setStartDate('');
    setEndDate('');
    setDaysBeforeCheckIn('7');
    setMinimumNights('7');
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listingId) return;

    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult <= 0) {
      toast({
        title: 'Invalid multiplier',
        description: 'Multiplier must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    const body: Record<string, unknown> = { type: ruleType, multiplier: mult };

    if (ruleType === 'seasonal') {
      if (!startDate || !endDate) {
        toast({
          title: 'Missing dates',
          description: 'Start and end dates are required for seasonal rules',
          variant: 'destructive',
        });
        return;
      }
      body.startDate = startDate;
      body.endDate = endDate;
    }

    if (ruleType === 'last_minute') {
      const days = parseInt(daysBeforeCheckIn, 10);
      if (isNaN(days) || days < 1) {
        toast({
          title: 'Invalid value',
          description: 'Days before check-in must be at least 1',
          variant: 'destructive',
        });
        return;
      }
      body.daysBeforeCheckIn = days;
    }

    if (ruleType === 'length_of_stay') {
      const nights = parseInt(minimumNights, 10);
      if (isNaN(nights) || nights < 1) {
        toast({
          title: 'Invalid value',
          description: 'Minimum nights must be at least 1',
          variant: 'destructive',
        });
        return;
      }
      body.minimumNights = nights;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/host/listings/${listingId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? 'Failed to create rule');
      }

      toast({ title: 'Rule created', description: 'Pricing rule has been added' });
      resetForm();
      fetchRules();
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to create rule',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(ruleId: string) {
    setDeletingId(ruleId);
    try {
      const res = await fetch(
        `/api/host/listings/${listingId}/pricing/${ruleId}`,
        { method: 'DELETE' },
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? 'Failed to delete rule');
      }

      toast({
        title: 'Rule removed',
        description: 'Pricing rule has been deleted',
      });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to delete rule',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="mb-8 h-5 w-72" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Pricing Rules
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure dynamic pricing to optimize your revenue
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        )}
      </div>

      {/* Add Rule Form */}
      {showForm && (
        <Card className="mb-8 rounded-2xl shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <CardContent className="p-6">
            <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
              New Pricing Rule
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Rule Type */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Rule Type
                </label>
                <div className="relative">
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as RuleType)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                  >
                    {(Object.keys(RULE_META) as RuleType[]).map((type) => (
                      <option key={type} value={type}>
                        {RULE_META[type].label} &mdash;{' '}
                        {RULE_META[type].description}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Multiplier - always visible */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Price Multiplier
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  placeholder="e.g. 1.2 for +20%, 0.85 for -15%"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  1.0 = base price, 1.2 = 20% increase, 0.85 = 15% discount
                </p>
              </div>

              {/* Seasonal: Date range */}
              {ruleType === 'seasonal' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                    />
                  </div>
                </div>
              )}

              {/* Last Minute: Days before check-in */}
              {ruleType === 'last_minute' && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Days Before Check-in
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={daysBeforeCheckIn}
                    onChange={(e) => setDaysBeforeCheckIn(e.target.value)}
                    placeholder="e.g. 7"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Apply this rule when booking is within this many days of
                    check-in
                  </p>
                </div>
              )}

              {/* Length of Stay: Minimum nights */}
              {ruleType === 'length_of_stay' && (
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Minimum Nights
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minimumNights}
                    onChange={(e) => setMinimumNights(e.target.value)}
                    placeholder="e.g. 7"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Apply this rule when the stay is at least this many nights
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {submitting ? 'Creating...' : 'Create Rule'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card className="rounded-2xl shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <Calendar className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              No pricing rules yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add rules to dynamically adjust your nightly rate
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const meta = RULE_META[rule.type];
            const Icon = meta?.icon ?? Calendar;
            const isDeleting = deletingId === rule.id;

            return (
              <Card
                key={rule.id}
                className="rounded-2xl shadow-sm ring-1 ring-slate-100 transition-all hover:ring-slate-200 dark:ring-slate-800 dark:hover:ring-slate-700"
              >
                <CardContent className="flex items-center gap-5 p-5">
                  {/* Icon */}
                  <div className="rounded-xl bg-slate-100 p-2.5 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {meta?.label ?? rule.type}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          rule.multiplier >= 1
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}
                      >
                        {formatMultiplier(rule.multiplier)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {rule.type === 'seasonal' &&
                        rule.startDate &&
                        rule.endDate && (
                          <p className="text-xs text-slate-500">
                            {formatDate(rule.startDate)} &ndash;{' '}
                            {formatDate(rule.endDate)}
                          </p>
                        )}
                      {rule.type === 'last_minute' &&
                        rule.daysBeforeCheckIn != null && (
                          <p className="text-xs text-slate-500">
                            Within {rule.daysBeforeCheckIn} days of check-in
                          </p>
                        )}
                      {rule.type === 'length_of_stay' &&
                        rule.minimumNights != null && (
                          <p className="text-xs text-slate-500">
                            {rule.minimumNights}+ nights
                          </p>
                        )}
                      {rule.type === 'weekend' && (
                        <p className="text-xs text-slate-500">
                          Fri &amp; Sat nights
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={isDeleting}
                    className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Delete rule"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
