import { eq } from 'drizzle-orm';

import { getDb, cancellationPolicies, listings } from '@lumina/db';
import type { CancellationPolicy, CancellationRule } from '@lumina/shared';
import { CANCELLATION_POLICIES } from '@lumina/shared';

export async function getCancellationPolicy(
  listingId: string,
): Promise<CancellationPolicy | null> {
  const db = getDb();

  const policy = await db.query.cancellationPolicies.findFirst({
    where: eq(cancellationPolicies.listingId, listingId),
  });

  if (policy) {
    return {
      id: policy.id,
      listingId: policy.listingId,
      type: policy.type,
      rules: policy.rules as CancellationRule[],
    };
  }

  // Fall back to the listing's cancellationPolicyType and use defaults
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    columns: { id: true, cancellationPolicyType: true },
  });

  if (!listing) return null;

  const policyType = listing.cancellationPolicyType ?? 'flexible';
  const defaults = CANCELLATION_POLICIES[policyType];

  return {
    id: '',
    listingId,
    type: policyType,
    rules: defaults.rules as unknown as CancellationRule[],
  };
}

export function calculateRefund(
  booking: { totalPrice: number; startDate: string; paidAt?: string },
  rules: CancellationRule[],
): { refundAmount: number; refundPercent: number } {
  const now = new Date();
  const checkin = new Date(booking.startDate + 'T00:00:00Z');
  const diffMs = checkin.getTime() - now.getTime();
  const daysBeforeCheckin = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Rules are sorted by daysBeforeCheckin descending.
  // Find the first rule where actual days >= rule.daysBeforeCheckin.
  const sortedRules = [...rules].sort(
    (a, b) => b.daysBeforeCheckin - a.daysBeforeCheckin,
  );

  let refundPercent = 0;
  for (const rule of sortedRules) {
    if (daysBeforeCheckin >= rule.daysBeforeCheckin) {
      refundPercent = rule.refundPercent;
      break;
    }
  }

  const refundAmount = Math.round(booking.totalPrice * refundPercent) / 100;

  return { refundAmount, refundPercent };
}
