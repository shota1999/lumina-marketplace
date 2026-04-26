import { eq, and } from 'drizzle-orm';

import { getDb, listings, pricingRules } from '@lumina/db';
import type { PriceQuote, NightlyPrice } from '@lumina/shared';
import { SERVICE_FEE_PERCENT } from '@lumina/shared';

/**
 * Get all dates between startDate (inclusive) and endDate (exclusive) as YYYY-MM-DD strings.
 */
function getDatesBetween(startDate: string, endDate: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

interface PricingRuleRow {
  id: string;
  type: string;
  name: string;
  adjustment: string;
  adjustmentType: string;
  config: Record<string, unknown> | null;
  priority: number;
  isActive: boolean;
}

function doesRuleApply(rule: PricingRuleRow, date: Date, totalNights: number): boolean {
  const config = rule.config ?? {};

  switch (rule.type) {
    case 'weekend': {
      const daysOfWeek = (config.daysOfWeek as number[]) ?? [0, 6]; // Sunday=0, Saturday=6
      return daysOfWeek.includes(date.getUTCDay());
    }
    case 'seasonal': {
      const seasonStart = config.startDate as string | undefined;
      const seasonEnd = config.endDate as string | undefined;
      if (!seasonStart || !seasonEnd) return false;
      const dateStr = formatDate(date);
      return dateStr >= seasonStart && dateStr <= seasonEnd;
    }
    case 'length_discount': {
      const minNights = (config.minNights as number) ?? 1;
      return totalNights >= minNights;
    }
    case 'custom': {
      return true;
    }
    default:
      return false;
  }
}

function applyAdjustment(price: number, adjustment: number, adjustmentType: string): number {
  if (adjustmentType === 'percent') {
    return price * (1 + adjustment / 100);
  }
  // fixed
  return price + adjustment;
}

export async function calculatePriceQuote(
  listingId: string,
  startDate: string,
  endDate: string,
  _guests: number,
): Promise<PriceQuote> {
  const db = getDb();

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  const rules = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.listingId, listingId), eq(pricingRules.isActive, true)))
    .orderBy(pricingRules.priority);

  const dates = getDatesBetween(startDate, endDate);
  const totalNights = dates.length;

  if (totalNights === 0) {
    throw new Error('Invalid date range: no nights between start and end date');
  }

  const nightly: NightlyPrice[] = dates.map((date) => {
    let price = Number(listing.pricePerNight);
    const appliedRules: string[] = [];

    for (const rule of rules) {
      if (doesRuleApply(rule, date, totalNights)) {
        price = applyAdjustment(price, Number(rule.adjustment), rule.adjustmentType);
        appliedRules.push(rule.name);
      }
    }

    return {
      date: formatDate(date),
      price: Math.round(price * 100) / 100,
      rules: appliedRules,
    };
  });

  const subtotal = nightly.reduce((sum, n) => sum + n.price, 0);
  const cleaningFee = Number(listing.cleaningFee);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT * 100) / 100;
  const total = Math.round((subtotal + cleaningFee + serviceFee) * 100) / 100;

  return {
    nightly,
    subtotal: Math.round(subtotal * 100) / 100,
    cleaningFee,
    serviceFee,
    total,
    currency: listing.currency,
    nights: totalNights,
  };
}
