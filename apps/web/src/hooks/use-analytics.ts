'use client';

import { useCallback } from 'react';

import type { AnalyticsEventType } from '@lumina/shared';

export function useAnalytics() {
  const track = useCallback(async (type: AnalyticsEventType, data: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
    } catch {
      // Silently fail — analytics should never break UX
    }
  }, []);

  return { track };
}
