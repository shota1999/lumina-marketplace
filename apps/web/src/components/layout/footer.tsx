import { Globe, Languages } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-20 bg-slate-50 dark:bg-slate-900/50" role="contentinfo">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-12 border-t border-slate-200 px-8 py-16 text-sm leading-relaxed md:grid-cols-4 dark:border-slate-800">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <span
            className="mb-4 block text-lg font-bold text-slate-900 dark:text-slate-50"
            aria-label="Lumina — Premium Rental Marketplace"
          >
            Lumina
          </span>
          <p className="max-w-xs text-slate-600 dark:text-slate-400">
            Curating the world&apos;s most exceptional coastal retreats for the discerning traveler.
          </p>
        </div>

        {/* Marketplace */}
        <nav aria-label="Marketplace links">
          <h4 className="mb-4 font-bold text-slate-900 dark:text-slate-50">Marketplace</h4>
          <ul className="space-y-3">
            <li>
              <Link
                href="/search"
                className="text-slate-600 opacity-80 transition-opacity hover:text-slate-900 hover:opacity-100 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Explore
              </Link>
            </li>
            <li>
              <Link
                href="/categories"
                className="text-slate-600 opacity-80 transition-opacity hover:text-slate-900 hover:opacity-100 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Destinations
              </Link>
            </li>
            <li>
              <Link
                href="/host"
                className="text-slate-600 opacity-80 transition-opacity hover:text-slate-900 hover:opacity-100 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Hosting
              </Link>
            </li>
          </ul>
        </nav>

        {/* Support */}
        <nav aria-label="Support links">
          <h4 className="mb-4 font-bold text-slate-900 dark:text-slate-50">Support</h4>
          <ul className="space-y-3">
            <li>
              <Link
                href="/about"
                className="text-slate-600 opacity-80 transition-opacity hover:text-slate-900 hover:opacity-100 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Help Center
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-slate-600 opacity-80 transition-opacity hover:text-slate-900 hover:opacity-100 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="text-slate-600 opacity-80 transition-opacity hover:text-slate-900 hover:opacity-100 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Terms
              </Link>
            </li>
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h4 className="mb-4 font-bold text-slate-900 dark:text-slate-50">Contact</h4>
          <p className="text-slate-600 dark:text-slate-400">concierge@lumina-premium.com</p>
          <div className="mt-4 flex gap-4" aria-hidden="true">
            <Globe className="h-5 w-5 text-slate-400" />
            <Languages className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-slate-200 px-8 py-8 text-xs text-slate-500 md:flex-row dark:border-slate-800">
        <p>
          &copy; {new Date().getFullYear()} Lumina Premium Rental Marketplace. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link href="/search" className="hover:underline">
            Sitemap
          </Link>
          <Link href="/about" className="hover:underline">
            Company
          </Link>
        </div>
      </div>
    </footer>
  );
}
