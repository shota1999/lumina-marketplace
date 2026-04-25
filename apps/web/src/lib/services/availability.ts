import { eq, and, or, lte, gte } from 'drizzle-orm';

import { getDb, bookings, availabilityBlocks, listings } from '@lumina/db';
import type { AvailabilityBlock } from '@lumina/shared';

/**
 * Get all dates between startDate and endDate (inclusive) as YYYY-MM-DD strings.
 */
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]!);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export async function getAvailability(
  listingId: string,
  startDate: string,
  endDate: string,
): Promise<{ bookedDates: string[]; blockedDates: string[] }> {
  const db = getDb();

  // Query overlapping confirmed/pending bookings
  const overlappingBookings = await db
    .select({ startDate: bookings.startDate, endDate: bookings.endDate })
    .from(bookings)
    .where(
      and(
        eq(bookings.listingId, listingId),
        or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'pending')),
        lte(bookings.startDate, endDate),
        gte(bookings.endDate, startDate),
      ),
    );

  // Query overlapping availability blocks
  const overlappingBlocks = await db
    .select({
      startDate: availabilityBlocks.startDate,
      endDate: availabilityBlocks.endDate,
    })
    .from(availabilityBlocks)
    .where(
      and(
        eq(availabilityBlocks.listingId, listingId),
        lte(availabilityBlocks.startDate, endDate),
        gte(availabilityBlocks.endDate, startDate),
      ),
    );

  // Expand booking ranges into individual dates within the queried range
  const bookedDatesSet = new Set<string>();
  for (const booking of overlappingBookings) {
    const rangeStart = booking.startDate > startDate ? booking.startDate : startDate;
    const rangeEnd = booking.endDate < endDate ? booking.endDate : endDate;
    for (const d of getDateRange(rangeStart, rangeEnd)) {
      bookedDatesSet.add(d);
    }
  }

  const blockedDatesSet = new Set<string>();
  for (const block of overlappingBlocks) {
    const rangeStart = block.startDate > startDate ? block.startDate : startDate;
    const rangeEnd = block.endDate < endDate ? block.endDate : endDate;
    for (const d of getDateRange(rangeStart, rangeEnd)) {
      blockedDatesSet.add(d);
    }
  }

  return {
    bookedDates: Array.from(bookedDatesSet).sort(),
    blockedDates: Array.from(blockedDatesSet).sort(),
  };
}

export async function createBlock(
  listingId: string,
  hostId: string,
  startDate: string,
  endDate: string,
  reason?: string,
): Promise<AvailabilityBlock> {
  const db = getDb();

  // Verify user is the host
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    columns: { id: true, hostId: true },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.hostId !== hostId) {
    throw new Error('Only the host can create availability blocks');
  }

  if (startDate > endDate) {
    throw new Error('Start date must be before or equal to end date');
  }

  const [block] = await db
    .insert(availabilityBlocks)
    .values({
      listingId,
      startDate,
      endDate,
      reason: reason ?? null,
    })
    .returning();

  return {
    id: block!.id,
    listingId: block!.listingId,
    startDate: block!.startDate,
    endDate: block!.endDate,
    reason: block!.reason ?? undefined,
    createdAt: block!.createdAt.toISOString(),
  };
}

export async function removeBlock(
  blockId: string,
  hostId: string,
): Promise<void> {
  const db = getDb();

  const block = await db.query.availabilityBlocks.findFirst({
    where: eq(availabilityBlocks.id, blockId),
  });

  if (!block) {
    throw new Error('Availability block not found');
  }

  // Verify ownership via listing
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, block.listingId),
    columns: { id: true, hostId: true },
  });

  if (!listing || listing.hostId !== hostId) {
    throw new Error('Only the host can remove availability blocks');
  }

  await db
    .delete(availabilityBlocks)
    .where(eq(availabilityBlocks.id, blockId));
}

export async function getBlocks(
  listingId: string,
): Promise<AvailabilityBlock[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(availabilityBlocks)
    .where(eq(availabilityBlocks.listingId, listingId))
    .orderBy(availabilityBlocks.startDate);

  return rows.map((row) => ({
    id: row.id,
    listingId: row.listingId,
    startDate: row.startDate,
    endDate: row.endDate,
    reason: row.reason ?? undefined,
    createdAt: row.createdAt.toISOString(),
  }));
}
