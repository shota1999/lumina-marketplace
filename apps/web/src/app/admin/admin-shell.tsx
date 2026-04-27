'use client';

import {
  Activity,
  BarChart3,
  Bell,
  Home,
  LayoutDashboard,
  List,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface AdminUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/listings', label: 'Listings', icon: List },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

interface HealthSnapshot {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail'; latencyMs?: number; message?: string }>;
}

function SidebarContent({
  pathname,
  pendingVerifications,
  health,
}: {
  pathname: string;
  pendingVerifications: number;
  health: HealthSnapshot | null;
}) {
  const healthScore =
    !health
      ? 0
      : health.status === 'healthy'
        ? 100
        : health.status === 'degraded'
          ? 60
          : 25;
  const dbLatency = health?.checks?.['database']?.latencyMs;
  const redisLatency = health?.checks?.['redis']?.latencyMs;

  return (
    <>
      <div className="flex items-center px-8 py-10">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tighter text-slate-900 dark:text-slate-50"
        >
          Lumina
        </Link>
        <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            (item.href === '/admin' && pathname === '/admin') ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const showBadge = item.href === '/admin/verifications' && pendingVerifications > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 rounded-lg px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                  : 'font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {pendingVerifications}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-4">
        <Link
          href="/"
          className="flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <Home className="h-5 w-5" />
          Back to site
        </Link>
      </div>

      <div className="px-8 py-8">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              System Health
            </p>
            <Activity
              className={`h-3 w-3 ${
                health?.status === 'healthy'
                  ? 'text-green-500'
                  : health?.status === 'degraded'
                    ? 'text-amber-500'
                    : 'text-red-500'
              }`}
            />
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                health?.status === 'healthy'
                  ? 'bg-green-500'
                  : health?.status === 'degraded'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
            {!health
              ? 'Checking...'
              : health.status === 'healthy'
                ? `All services operational${dbLatency !== undefined ? ` · DB ${dbLatency}ms` : ''}${redisLatency !== undefined ? ` · Redis ${redisLatency}ms` : ''}`
                : 'Some services are degraded'}
          </p>
        </div>
      </div>
    </>
  );
}

function getPageTitle(pathname: string): string {
  const match = NAV_ITEMS.find(
    (i) =>
      (i.href === '/admin' && pathname === '/admin') ||
      (i.href !== '/admin' && pathname.startsWith(i.href)),
  );
  return match?.label ?? 'Admin';
}

export function AdminShell({ children, user }: { children: ReactNode; user: AdminUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);

  // Poll health every 30s and pending verifications every 60s
  useEffect(() => {
    let healthTimer: ReturnType<typeof setInterval> | null = null;
    let pendingTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function loadHealth() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        const json = (await res.json()) as HealthSnapshot;
        if (!cancelled) setHealth(json);
      } catch {
        if (!cancelled) setHealth({ status: 'unhealthy', checks: {} });
      }
    }

    async function loadPending() {
      try {
        const res = await fetch('/api/admin/verifications', { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled && json.success) {
          setPendingVerifications((json.data ?? []).length);
        }
      } catch {
        // silent
      }
    }

    loadHealth();
    loadPending();
    healthTimer = setInterval(loadHealth, 30_000);
    pendingTimer = setInterval(loadPending, 60_000);

    return () => {
      cancelled = true;
      if (healthTimer) clearInterval(healthTimer);
      if (pendingTimer) clearInterval(pendingTimer);
    };
  }, []);

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 z-50 hidden h-screen w-72 flex-col bg-white/80 backdrop-blur-xl md:flex dark:bg-slate-950/80">
        <SidebarContent
          pathname={pathname}
          pendingVerifications={pendingVerifications}
          health={health}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-white dark:bg-slate-950">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              pathname={pathname}
              pendingVerifications={pendingVerifications}
              health={health}
            />
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex w-full items-center justify-between bg-white/80 px-8 py-6 shadow-sm backdrop-blur-xl dark:bg-slate-950/80">
          <div className="flex items-center gap-4">
            <button
              className="p-2 text-slate-900 md:hidden dark:text-slate-50"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {getPageTitle(pathname)}
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Welcome back, {user.name.split(' ')[0]}.
                {health?.status === 'healthy' ? ' All services operational.' : ' Check system health.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/verifications"
              className="relative rounded-full p-2 text-slate-900 transition-colors hover:bg-slate-100 dark:text-slate-50 dark:hover:bg-slate-800"
              aria-label={`${pendingVerifications} pending verifications`}
            >
              <Bell className="h-5 w-5" />
              {pendingVerifications > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                  {pendingVerifications > 9 ? '9+' : pendingVerifications}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{user.name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Admin
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1400px] space-y-12 p-8">{children}</div>

        <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-8 pb-8 pt-12 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 md:grid-cols-4">
            <div>
              <span className="text-xl font-black text-slate-900 dark:text-slate-50">Lumina</span>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Administrative interface for managing the Lumina rental marketplace.
              </p>
            </div>
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Manage
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/admin/listings"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Listings
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/users"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Users
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/verifications"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Verifications
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Insights
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/admin/analytics"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    API Docs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Legal
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-[1400px] border-t border-slate-200 pt-8 dark:border-slate-800">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Lumina Premium Rentals. Admin · {user.email}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
