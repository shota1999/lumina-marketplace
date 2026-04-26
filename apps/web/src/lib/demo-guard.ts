import { NextResponse } from 'next/server';

import type { User } from '@lumina/shared';

/**
 * In demo mode (DEMO_MODE=true), block destructive admin/host actions from
 * publicly-known demo accounts so a casual visitor can't vandalise the deploy.
 * Read-only actions and content creation stay open so recruiters can still
 * explore the host and admin surfaces.
 */
const DEMO_BLOCKED_EMAILS = new Set([
  'admin@lumina.dev',
  'host@lumina.dev',
  'guest@lumina.dev',
  'traveler@lumina.dev',
]);

export function isDemoMode(): boolean {
  return process.env['DEMO_MODE'] === 'true';
}

export function isDemoAccount(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  return DEMO_BLOCKED_EMAILS.has(user.email.toLowerCase());
}

/**
 * Returns a 403 response if the request would mutate data on behalf of a
 * publicly-known demo account in DEMO_MODE. Returns null when the action is
 * allowed.
 */
export function blockDemoMutation(
  user: Pick<User, 'email'> | null | undefined,
): NextResponse | null {
  if (!isDemoMode()) return null;
  if (!isDemoAccount(user)) return null;
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'DEMO_MODE',
        message:
          'This action is disabled on the public demo deploy. Clone the repo to try it locally.',
      },
    },
    { status: 403 },
  );
}
