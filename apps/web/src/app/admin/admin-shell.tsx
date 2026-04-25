'use client';

import {
  BarChart3,
  Bell,
  Home,
  LayoutDashboard,
  List,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/listings', label: 'Listings', icon: List },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center px-8 py-10">
        <Link href="/" className="text-2xl font-bold tracking-tighter text-slate-900 dark:text-slate-50">
          Lumina
        </Link>
        <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-2 px-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            (item.href === '/admin' && pathname === '/admin') ||
            (item.href !== '/admin' && pathname.startsWith(item.href));

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
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to site */}
      <div className="px-4 pb-4">
        <Link
          href="/"
          className="flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <Home className="h-5 w-5" />
          Back to site
        </Link>
      </div>

      {/* System Health */}
      <div className="px-8 py-8">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            System Health
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full w-[94%] rounded-full bg-slate-900 dark:bg-slate-50" />
          </div>
          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
            All services operational
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

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-50 hidden h-screen w-72 flex-col bg-white/80 backdrop-blur-xl md:flex dark:bg-slate-950/80">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar overlay */}
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
            <SidebarContent pathname={pathname} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
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
                Welcome back, Admin. System status is optimal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden items-center rounded-full bg-slate-50 px-4 py-2 lg:flex dark:bg-slate-800">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search data..."
                className="w-48 border-none bg-transparent text-sm focus:ring-0 placeholder:text-slate-400 dark:text-slate-50"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="relative rounded-full p-2 text-slate-900 transition-colors hover:bg-slate-100 dark:text-slate-50 dark:hover:bg-slate-800">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="mx-auto w-full max-w-[1400px] space-y-12 p-8">
          {children}
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-8 pb-8 pt-12 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 md:grid-cols-4">
            <div>
              <span className="text-xl font-black text-slate-900 dark:text-slate-50">Lumina</span>
              <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                The premier administrative interface for managing high-end rental ecosystems.
              </p>
            </div>
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Resources
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link href="/admin" className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    API Keys
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Support
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    System Status
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
                  <Link href="/privacy" className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-[1400px] border-t border-slate-200 pt-8 dark:border-slate-800">
            <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Lumina Premium Rentals. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
