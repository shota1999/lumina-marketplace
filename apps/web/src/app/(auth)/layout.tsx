import type { ReactNode } from 'react';

import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f9f9ff] bg-[radial-gradient(#dce2f7_0.5px,transparent_0.5px)] bg-[length:24px_24px] dark:bg-slate-950 dark:bg-[radial-gradient(#1e293b_0.5px,transparent_0.5px)]">
      <main className="flex flex-grow items-center justify-center px-6 py-12">{children}</main>
      <footer className="w-full bg-slate-50 pb-8 pt-16 dark:bg-slate-900">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="mb-4 block text-xl font-black text-slate-900 dark:text-slate-50"
            >
              Lumina
            </Link>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} Lumina Premium Rentals. All rights reserved.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-3 md:grid-cols-3">
            <div className="flex flex-col gap-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Company
              </h4>
              <Link
                href="/about"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                About Us
              </Link>
              <Link
                href="/about"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Careers
              </Link>
              <Link
                href="/about"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Press
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Support
              </h4>
              <Link
                href="/about"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Contact Us
              </Link>
              <Link
                href="/about"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Support
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
                Legal
              </h4>
              <Link
                href="/privacy"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-slate-500 transition-opacity hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cookie Settings
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
