'use client';

import { Sparkles, Shield, Home, User as UserIcon, Plane, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Persona = 'admin' | 'host' | 'guest' | 'traveler';

interface PersonaConfig {
  id: Persona;
  label: string;
  description: string;
  icon: typeof Shield;
  accent: string;
}

const PERSONAS: PersonaConfig[] = [
  {
    id: 'admin',
    label: 'Admin',
    description: 'Analytics, listings, verifications',
    icon: Shield,
    accent: 'from-violet-500 to-fuchsia-500',
  },
  {
    id: 'host',
    label: 'Host',
    description: 'Dashboard, earnings, calendar',
    icon: Home,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    id: 'guest',
    label: 'Guest',
    description: 'Bookings, favorites, saved searches',
    icon: UserIcon,
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'traveler',
    label: 'Traveler',
    description: 'Second guest profile',
    icon: Plane,
    accent: 'from-sky-500 to-indigo-500',
  },
];

export function DemoQuickLogin() {
  const enabled = process.env['NEXT_PUBLIC_DEMO_MODE'] === 'true';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  async function signInAs(persona: Persona) {
    setPending(persona);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message ?? 'Demo login failed');
        return;
      }
      const dest = persona === 'admin' ? '/admin' : persona === 'host' ? '/host' : '/';
      router.push(dest);
      router.refresh();
      setOpen(false);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10 transition-all hover:scale-105 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100"
          aria-label="Open recruiter quick login"
        >
          <Sparkles className="h-4 w-4 text-amber-400 dark:text-amber-500" />
          <span>Recruiter login</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  One-click demo access
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                No passwords. Pick a role to explore as.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-1 -mt-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5 p-3">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isPending = pending === p.id;
              const disabled = pending !== null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => signInAs(p.id)}
                  disabled={disabled}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${p.accent} text-white shadow-sm`}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        Sign in as {p.label}
                      </p>
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {p.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-50">
                    →
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
            Demo mode is on — destructive actions on these accounts return 403 so you can browse safely.
          </div>
        </div>
      )}
    </>
  );
}
