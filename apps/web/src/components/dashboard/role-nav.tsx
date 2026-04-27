'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

export interface RoleNavTab {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  exact?: boolean;
}

interface RoleNavProps {
  title: string;
  subtitle: string;
  accent: 'admin' | 'host' | 'guest';
  tabs: RoleNavTab[];
  rightSlot?: React.ReactNode;
}

const ACCENTS: Record<RoleNavProps['accent'], { gradient: string; ring: string; pillBg: string; pillText: string }> = {
  admin: {
    gradient: 'from-violet-600 via-fuchsia-600 to-pink-600',
    ring: 'ring-violet-200/60 dark:ring-violet-900/30',
    pillBg: 'bg-violet-100 dark:bg-violet-950/40',
    pillText: 'text-violet-700 dark:text-violet-300',
  },
  host: {
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    ring: 'ring-amber-200/60 dark:ring-amber-900/30',
    pillBg: 'bg-amber-100 dark:bg-amber-950/40',
    pillText: 'text-amber-700 dark:text-amber-300',
  },
  guest: {
    gradient: 'from-sky-500 via-cyan-500 to-emerald-500',
    ring: 'ring-sky-200/60 dark:ring-sky-900/30',
    pillBg: 'bg-sky-100 dark:bg-sky-950/40',
    pillText: 'text-sky-700 dark:text-sky-300',
  },
};

export function RoleNav({ title, subtitle, accent, tabs, rightSlot }: RoleNavProps) {
  const pathname = usePathname();
  const a = ACCENTS[accent];

  return (
    <div className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="mx-auto max-w-7xl px-6 pt-8 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-4 ${a.gradient} ${a.ring}`}
            >
              <span className="text-lg font-black tracking-tight">
                {title.charAt(0)}
              </span>
            </div>
            <div>
              <p className={`mb-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${a.pillBg} ${a.pillText}`}>
                {accent} hub
              </p>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>
          {rightSlot ? <div className="flex shrink-0 items-center gap-2">{rightSlot}</div> : null}
        </div>

        <nav className="mt-8 -mb-px flex gap-1 overflow-x-auto pb-0 scrollbar-thin">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`group relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-slate-900 text-slate-900 dark:border-slate-50 dark:text-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? `${a.pillBg} ${a.pillText}` : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
