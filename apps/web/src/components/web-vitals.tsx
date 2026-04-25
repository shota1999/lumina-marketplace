'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Reports Core Web Vitals (LCP, FID, CLS, TTFB, INP) to the analytics
 * endpoint. In production, these metrics help identify real-user performance
 * regressions.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics endpoint (fire-and-forget)
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // "good" | "needs-improvement" | "poor"
      id: metric.id,
      navigationType: metric.navigationType,
    });

    // Use sendBeacon for reliability during page unload
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/analytics/vitals', body);
    } else {
      fetch('/api/analytics/vitals', {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {
        // Non-critical — silently ignore
      });
    }
  });

  return null;
}
