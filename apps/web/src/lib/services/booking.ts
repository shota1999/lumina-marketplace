import { and, eq, or, lte, gte } from 'drizzle-orm';

import { getDb, bookings, listings } from '@lumina/db';

import { audit } from '@/lib/audit';
import { captureBusinessFailure } from '@/lib/error-capture';
import type { RequestLogger } from '@/lib/logger';

import { validateBookingDates, calculateNights, calculateTotalPrice } from './booking-validation';

interface BookingInput {
  listingId: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  guests: number;
  requestId?: string;
  log?: RequestLogger;
}

interface BookingResult {
  success: true;
  booking: {
    id: string;
    listingId: string;
    startDate: string;
    endDate: string;
    guests: number;
    nights: number;
    totalPrice: number;
    status: string;
  };
}

export interface BookingError {
  success: false;
  code: string;
  message: string;
}

export async function createBooking(input: BookingInput): Promise<BookingResult | BookingError> {
  const { listingId, userId, startDate, endDate, guests, requestId, log } = input;

  // Validate dates using pure logic
  const dateError = validateBookingDates({ startDate, endDate });
  if (dateError) {
    return { success: false, ...dateError };
  }

  const nights = calculateNights(startDate, endDate);

  const db = getDb();

  // Fetch listing
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.status, 'published')),
  });

  if (!listing) {
    return { success: false, code: 'NOT_FOUND', message: 'Listing not found' };
  }

  if (guests > listing.maxGuests) {
    return {
      success: false,
      code: 'TOO_MANY_GUESTS',
      message: `Maximum ${listing.maxGuests} guests allowed`,
    };
  }

  // Check for overlapping bookings (any active booking that overlaps the date range)
  const overlapping = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.listingId, listingId),
      or(eq(bookings.status, 'pending'), eq(bookings.status, 'confirmed')),
      // Overlap: existing.start < new.end AND existing.end > new.start
      lte(bookings.startDate, endDate),
      gte(bookings.endDate, startDate),
    ),
  });

  if (overlapping) {
    captureBusinessFailure('booking.create', 'UNAVAILABLE', { requestId, userId, listingId });
    return {
      success: false,
      code: 'UNAVAILABLE',
      message: 'These dates are not available',
    };
  }

  const totalPrice = calculateTotalPrice(Number(listing.pricePerNight), nights);

  log?.info('Inserting booking', { listingId, nights, totalPrice });

  const [booking] = await db
    .insert(bookings)
    .values({
      listingId,
      userId,
      startDate,
      endDate,
      guests,
      totalPrice: String(totalPrice),
      status: 'pending',
    })
    .returning();

  audit({
    action: 'booking.created',
    userId,
    requestId,
    resourceId: booking!.id,
    meta: { listingId, nights, totalPrice },
  });

  return {
    success: true,
    booking: {
      id: booking!.id,
      listingId: booking!.listingId,
      startDate: booking!.startDate,
      endDate: booking!.endDate,
      guests: booking!.guests,
      nights,
      totalPrice,
      status: booking!.status,
    },
  };
}

/**
 * Confirm a pending booking (simulated payment step).
 * Idempotent: confirming an already-confirmed booking returns success.
 */
export async function confirmBooking(
  bookingId: string,
  userId: string,
  opts?: { requestId?: string; log?: RequestLogger },
): Promise<{ success: true } | BookingError> {
  const db = getDb();

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    return { success: false, code: 'NOT_FOUND', message: 'Booking not found' };
  }

  // Idempotent: if already confirmed, treat as success (safe retry)
  if (booking.status === 'confirmed') {
    opts?.log?.info('Idempotent confirm — booking already confirmed', { bookingId });
    return { success: true };
  }

  if (booking.status !== 'pending') {
    captureBusinessFailure('booking.confirm', 'INVALID_STATUS', {
      requestId: opts?.requestId,
      userId,
      bookingId,
      currentStatus: booking.status,
    });
    return { success: false, code: 'INVALID_STATUS', message: `Booking is already ${booking.status}` };
  }

  await db
    .update(bookings)
    .set({ status: 'confirmed' })
    .where(eq(bookings.id, bookingId));

  audit({
    action: 'booking.confirmed',
    userId,
    requestId: opts?.requestId,
    resourceId: bookingId,
  });

  return { success: true };
}

/**
 * Cancel a pending or confirmed booking.
 * Idempotent: cancelling an already-cancelled booking returns success.
 */
export async function cancelBooking(
  bookingId: string,
  userId: string,
  opts?: { requestId?: string; log?: RequestLogger },
): Promise<{ success: true } | BookingError> {
  const db = getDb();

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    return { success: false, code: 'NOT_FOUND', message: 'Booking not found' };
  }

  if (booking.status === 'cancelled') {
    opts?.log?.info('Idempotent cancel — booking already cancelled', { bookingId });
    return { success: true };
  }

  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    captureBusinessFailure('booking.cancel', 'INVALID_STATUS', {
      requestId: opts?.requestId,
      userId,
      bookingId,
      currentStatus: booking.status,
    });
    return { success: false, code: 'INVALID_STATUS', message: `Cannot cancel a ${booking.status} booking` };
  }

  await db
    .update(bookings)
    .set({ status: 'cancelled' })
    .where(eq(bookings.id, bookingId));

  audit({
    action: 'booking.cancelled',
    userId,
    requestId: opts?.requestId,
    resourceId: bookingId,
  });

  return { success: true };
}
