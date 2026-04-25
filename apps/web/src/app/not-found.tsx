import { Compass } from 'lucide-react';
import Link from 'next/link';

import { Footer } from '@/components/layout/footer';

const QUICK_LINKS = [
  { href: '/categories', label: 'Categories' },
  { href: '/experiences', label: 'Experiences' },
  { href: '/search?category=villa', label: 'Villas' },
  { href: '/search?category=cabin', label: 'Cabins' },
  { href: '/search?category=castle', label: 'Castles' },
];

export default function NotFound() {
  return (
    <>
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#f9f9ff] to-[#f1f3ff]/30 px-6">
        {/* Background concentric circles */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-[300px] w-[300px] rounded-full border border-slate-900/10 opacity-60" />
            <div className="absolute h-[450px] w-[450px] rounded-full border border-slate-900/10 opacity-40" />
            <div className="absolute h-[600px] w-[600px] rounded-full border border-slate-900/10 opacity-20" />
            <div className="absolute h-[800px] w-[800px] rounded-full border border-slate-900/10 opacity-10" />
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-12 text-center">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-white p-8 shadow-sm dark:bg-slate-900">
              <Compass className="h-16 w-16 text-slate-600 dark:text-slate-300" strokeWidth={1} />
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-4">
            <h1 className="select-none text-8xl font-black tracking-tighter text-slate-900/10 md:text-9xl dark:text-slate-50/10">
              404
            </h1>
            <div className="-mt-12 space-y-2 md:-mt-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-slate-50">
                Page not found
              </h2>
              <p className="mx-auto max-w-md text-lg leading-relaxed text-slate-500 md:text-xl dark:text-slate-400">
                Oops! The property or experience you&apos;re looking for doesn&apos;t exist.
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-8 py-4 font-semibold text-white transition-all hover:opacity-90 dark:bg-slate-50 dark:text-slate-900"
            >
              Back to home
            </Link>
            <Link
              href="/search"
              className="rounded-lg border-2 border-slate-200 bg-transparent px-8 py-4 font-semibold text-slate-900 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-50 dark:hover:bg-slate-800"
            >
              Search listings
            </Link>
          </div>

          {/* Quick links */}
          <div className="space-y-6 pt-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400/60 dark:text-slate-500/60">
              Discover more
            </p>
            <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-transparent bg-white px-5 py-2 text-sm font-medium text-slate-500 transition-colors hover:border-slate-200 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
