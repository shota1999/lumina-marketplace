'use client';

import {
  BarChart3,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button, cn } from '@lumina/ui';

const navItems = [
  { label: 'Dashboard', href: '/host/dashboard', icon: LayoutDashboard },
  { label: 'Listings', href: '/host/listings', icon: Building },
  { label: 'Bookings', href: '/host/bookings', icon: ClipboardList },
  { label: 'Earnings', href: '/host/earnings', icon: BarChart3 },
];

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Don't wrap the landing page (/host) with the sidebar layout
  if (pathname === '/host') {
    return <>{children}</>;
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 mt-16 flex flex-col border-r border-slate-100 bg-white transition-all duration-200 lg:relative lg:mt-0 dark:border-slate-800 dark:bg-slate-950',
          collapsed ? 'w-16' : 'w-60',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-800">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Host Panel
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1 text-slate-400 hover:text-slate-600 lg:block dark:hover:text-slate-300"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 lg:hidden dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Host Panel
          </span>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
