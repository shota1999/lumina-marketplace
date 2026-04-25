'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.ok) {
          const json = await res.json();
          if (mounted) setCount(json.data?.count ?? 0);
        }
      } catch {
        // silently fail
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
