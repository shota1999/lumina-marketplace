'use client';

import { CheckCircle2, Search, Shield, ShieldCheck, User as UserIcon, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Skeleton } from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'host' | 'admin';
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
  listingCount: number;
  bookingCount: number;
}

const ROLE_OPTIONS: Array<{ id: 'user' | 'host' | 'admin'; label: string; icon: typeof UserIcon; accent: string }> = [
  { id: 'user', label: 'User', icon: UserIcon, accent: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'host', label: 'Host', icon: Home, accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { id: 'admin', label: 'Admin', icon: Shield, accent: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(25);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'host' | 'admin'>('all');

  const fetchUsers = useCallback(
    async (p: number, q: string, role: typeof roleFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: String(pageSize) });
        if (q) params.set('q', q);
        if (role !== 'all') params.set('role', role);
        const res = await fetch(`/api/admin/users?${params.toString()}`);
        const json = await res.json();
        if (!json.success) {
          toast({ title: 'Failed to load users', variant: 'destructive' });
          setUsers([]);
          setTotal(0);
          return;
        }
        setUsers(json.data.data ?? []);
        setTotal(json.data.total ?? 0);
        setPage(json.data.page ?? p);
      } catch {
        toast({ title: 'Network error', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(1, query, roleFilter), 250);
    return () => clearTimeout(t);
  }, [fetchUsers, query, roleFilter]);

  async function changeRole(id: string, role: 'user' | 'host' | 'admin') {
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      });
      const json = await res.json();
      if (!json.success) {
        setUsers(previous);
        toast({
          title: 'Could not change role',
          description: json.error?.message ?? 'Action blocked',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Role updated', description: `User is now a ${role}` });
    } catch {
      setUsers(previous);
      toast({ title: 'Network error', variant: 'destructive' });
    }
  }

  async function toggleVerified(id: string, isVerified: boolean) {
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isVerified: !isVerified } : u)));
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isVerified: !isVerified }),
      });
      const json = await res.json();
      if (!json.success) {
        setUsers(previous);
        toast({ title: 'Could not update', variant: 'destructive' });
      }
    } catch {
      setUsers(previous);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const verifiedCount = users.filter((u) => u.isVerified).length;
  const hostCount = users.filter((u) => u.role === 'host').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <StatCard label="Total Users" value={total.toLocaleString()} />
        <StatCard label="Hosts on this page" value={hostCount.toLocaleString()} />
        <StatCard label="Admins on this page" value={adminCount.toLocaleString()} />
        <StatCard label="Verified on this page" value={verifiedCount.toLocaleString()} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border-none bg-slate-50 py-2.5 pl-10 pr-4 text-sm transition-all focus:ring-2 focus:ring-slate-900/10 sm:w-80 dark:bg-slate-800 dark:text-slate-50"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-1 dark:bg-slate-800">
          {(['all', 'user', 'host', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                roleFilter === r
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'
              }`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-0 divide-y divide-slate-50 dark:divide-slate-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-5">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-20 text-center text-sm text-slate-400">
            No users match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    User
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Role
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Activity
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Verified
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {users.map((u) => {
                  const initial = u.name.charAt(0).toUpperCase();
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {u.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{u.name}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-0.5 dark:bg-slate-800">
                          {ROLE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const active = u.role === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => !active && changeRole(u.id, opt.id)}
                                title={`Set role to ${opt.label}`}
                                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold transition-colors ${
                                  active
                                    ? `${opt.accent} shadow-sm`
                                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
                                }`}
                              >
                                <Icon className="h-3 w-3" />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-slate-900 dark:text-slate-50">{u.listingCount}</span> listings ·{' '}
                        <span className="font-bold text-slate-900 dark:text-slate-50">{u.bookingCount}</span> bookings
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleVerified(u.id, u.isVerified)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                            u.isVerified
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {u.isVerified ? <ShieldCheck className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {u.isVerified ? 'Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > pageSize && (
          <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/30 px-6 py-6 dark:border-slate-800 dark:bg-slate-800/30">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchUsers(page - 1, query, roleFilter)}
                disabled={page <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => fetchUsers(page + 1, query, roleFilter)}
                disabled={page >= totalPages}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50">{value}</h3>
    </div>
  );
}
