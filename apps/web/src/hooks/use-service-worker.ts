'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for PWA support.
 * Only runs in production to avoid caching dev assets.
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // Unregister any leftover SW from a previous prod build / earlier dev session
      // so cached _next/static chunks don't shadow fresh dev rebuilds.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — non-critical, ignore silently
      });
    });
  }, []);
}
