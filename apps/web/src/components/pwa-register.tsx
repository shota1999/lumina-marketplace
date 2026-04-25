'use client';

import { useServiceWorker } from '@/hooks/use-service-worker';

export function PWARegister() {
  useServiceWorker();
  return null;
}
