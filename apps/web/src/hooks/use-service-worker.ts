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

    // Register after page load to avoid blocking initial render
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {
          // SW registration failed — non-critical, ignore silently
        });
    });
  }, []);
}
