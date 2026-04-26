'use client';

import { ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

import { formatPrice } from '@lumina/shared';
import { Card, CardContent, Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface EarningsData {
  totalEarned: number;
  thisMonth: number;
  averagePerBooking: number;
  monthlyEarnings: { month: string; amount: number }[];
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="rounded-2xl shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {value}
            </p>
            {trend && (
              <p
                className={`mt-1 flex items-center gap-0.5 text-xs ${trendUp ? 'text-green-600' : 'text-red-500'}`}
              >
                {trendUp ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {trend}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-slate-900 p-2.5 dark:bg-slate-100">
            <Icon className="h-4 w-4 text-white dark:text-slate-900" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HostEarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [earningsRes, dashboardRes] = await Promise.all([
          fetch('/api/host/earnings'),
          fetch('/api/host/dashboard'),
        ]);

        const earningsData = await earningsRes.json();
        const dashboardData = await dashboardRes.json();

        const earnings = earningsData?.success ? earningsData.data : {};
        const dashboard = dashboardData?.success ? dashboardData.data : {};

        setData({
          totalEarned: dashboard.totalEarnings ?? earnings.totalEarned ?? 0,
          thisMonth: earnings.thisMonth ?? 0,
          averagePerBooking: earnings.averagePerBooking ?? 0,
          monthlyEarnings: earnings.monthlyEarnings ?? [],
          recentTransactions: earnings.recentTransactions ?? [],
        });
      } catch {
        toast({ title: 'Error', description: 'Failed to load earnings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <Skeleton className="mb-2 h-8 w-40" />
        <Skeleton className="mb-8 h-5 w-56" />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mb-6 h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const monthlyEarnings = data?.monthlyEarnings ?? [];
  const maxEarning = Math.max(...monthlyEarnings.map((m) => m.amount), 1);
  const recentTransactions = data?.recentTransactions ?? [];

  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Earnings
        </h1>
        <p className="mt-1 text-sm text-slate-500">Track your revenue and payout history</p>
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Earned"
          value={formatPrice(data?.totalEarned ?? 0)}
          icon={DollarSign}
          trend="All time"
        />
        <StatCard
          label="This Month"
          value={formatPrice(data?.thisMonth ?? 0)}
          icon={TrendingUp}
          trend="+12% vs last month"
          trendUp
        />
        <StatCard
          label="Avg. per Booking"
          value={formatPrice(data?.averagePerBooking ?? 0)}
          icon={Wallet}
        />
      </div>

      {/* Monthly Chart */}
      {monthlyEarnings.length > 0 && (
        <div className="mb-8 flex min-h-[300px] flex-col rounded-xl bg-slate-50 p-8 dark:bg-slate-800/50">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Monthly Revenue
              </h4>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Your earnings over time
              </p>
            </div>
          </div>
          <div className="flex flex-1 items-end justify-between gap-3 px-2 pb-4">
            {monthlyEarnings.map((m, i) => {
              const pct = Math.max((m.amount / maxEarning) * 100, 4);
              return (
                <div key={i} className="group relative flex w-full flex-col items-center">
                  <span className="absolute -top-7 text-[10px] font-bold text-slate-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-300">
                    {formatPrice(m.amount)}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-slate-900 opacity-80 transition-all group-hover:opacity-100 dark:bg-slate-300"
                    style={{ height: `${pct}%`, minHeight: '8px' }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between px-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {monthlyEarnings.map((m, i) => (
              <span key={i}>{m.month}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-900">
        <div className="px-6 py-5">
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            Recent Transactions
          </h4>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="px-6 pb-8 text-center">
            <DollarSign className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                      {tx.description}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {tx.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-500 dark:text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right font-bold text-green-600 dark:text-green-400">
                      +{formatPrice(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
