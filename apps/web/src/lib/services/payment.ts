import { eq, and } from 'drizzle-orm';

import { getDb, bookings, listings, payments } from '@lumina/db';
import type { Payment } from '@lumina/shared';

import { getStripe } from '@/lib/stripe';

export async function createCheckoutSession(
  bookingId: string,
  userId: string,
): Promise<{ sessionUrl: string }> {
  const db = getDb();
  const stripe = getStripe();

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== 'pending') {
    throw new Error(`Cannot pay for a ${booking.status} booking`);
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, booking.listingId),
    columns: { id: true, title: true, currency: true },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  const amountInCents = Math.round(Number(booking.totalPrice) * 100);
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

  const isTestMode = process.env['STRIPE_SECRET_KEY']?.startsWith('sk_test_') ?? false;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: listing.currency.toLowerCase(),
          product_data: {
            name: listing.title,
            description: `Booking: ${booking.startDate} to ${booking.endDate}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: booking.id,
      userId,
    },
    success_url: `${appUrl}/bookings/${booking.id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/bookings/${booking.id}/checkout?canceled=1`,
    // In test mode, show the sandbox card right above the Pay button so
    // users running a demo know exactly what to enter.
    ...(isTestMode && {
      custom_text: {
        submit: {
          message:
            '🧪 TEST MODE — use card 4242 4242 4242 4242, any future expiry (e.g. 12/34), any CVC (e.g. 123), any ZIP (e.g. 12345). No real charge will be made.',
        },
      },
    }),
  });

  // Create payment record and store checkout session ID
  await db.insert(payments).values({
    bookingId: booking.id,
    stripeCheckoutSessionId: session.id,
    amount: booking.totalPrice,
    currency: listing.currency,
    status: 'processing',
  });

  if (!session.url) {
    throw new Error('Failed to create Stripe checkout session');
  }

  return { sessionUrl: session.url };
}

export async function handleWebhookEvent(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<void> {
  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as {
        id: string;
        payment_intent: string;
        metadata: { bookingId: string };
      };

      // Update payment record
      await db
        .update(payments)
        .set({
          status: 'succeeded',
          stripePaymentIntentId: session.payment_intent,
          updatedAt: new Date(),
        })
        .where(eq(payments.stripeCheckoutSessionId, session.id));

      // Confirm the booking
      const bookingId = session.metadata.bookingId;
      if (bookingId) {
        await db
          .update(bookings)
          .set({
            status: 'confirmed',
            stripePaymentIntentId: session.payment_intent,
            paidAt: new Date(),
          })
          .where(eq(bookings.id, bookingId));
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as {
        payment_intent: string;
        amount_refunded: number;
      };

      if (charge.payment_intent) {
        const refundedAmount = String((charge.amount_refunded / 100).toFixed(2));
        await db
          .update(payments)
          .set({
            refundedAmount,
            status: 'refunded',
            updatedAt: new Date(),
          })
          .where(eq(payments.stripePaymentIntentId, charge.payment_intent));
      }
      break;
    }
  }
}

export async function processRefund(
  bookingId: string,
  amount?: number,
  reason?: string,
): Promise<void> {
  const db = getDb();
  const stripe = getStripe();

  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.bookingId, bookingId),
      eq(payments.status, 'succeeded'),
    ),
  });

  if (!payment) {
    throw new Error('No successful payment found for this booking');
  }

  if (!payment.stripePaymentIntentId) {
    throw new Error('Payment has no Stripe payment intent ID');
  }

  const refundAmount = amount
    ? Math.round(amount * 100)
    : undefined; // undefined = full refund

  await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    ...(refundAmount ? { amount: refundAmount } : {}),
    ...(reason ? { reason: 'requested_by_customer' } : {}),
  });

  const refundedDecimal = amount
    ? String(amount.toFixed(2))
    : payment.amount;

  const isPartial = amount !== undefined && amount < Number(payment.amount);

  await db
    .update(payments)
    .set({
      refundedAmount: refundedDecimal,
      status: isPartial ? 'partially_refunded' : 'refunded',
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  // Also update booking refunded amount
  await db
    .update(bookings)
    .set({
      refundedAmount: refundedDecimal,
      status: 'cancelled',
    })
    .where(eq(bookings.id, bookingId));
}

/**
 * Verifies a Stripe Checkout Session and reconciles the local booking/payment
 * records with Stripe's payment_status. Safe to call multiple times (idempotent).
 *
 * Useful in dev where the webhook forwarder may not be running — calling this
 * from the confirmation page's landing request bridges the gap.
 */
export async function verifyCheckoutSession(
  bookingId: string,
  sessionId: string,
): Promise<{ paid: boolean }> {
  const db = getDb();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === 'paid';
  if (!paid) return { paid: false };

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  await db
    .update(payments)
    .set({
      status: 'succeeded',
      stripePaymentIntentId: paymentIntentId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(payments.stripeCheckoutSessionId, session.id));

  await db
    .update(bookings)
    .set({
      status: 'confirmed',
      stripePaymentIntentId: paymentIntentId ?? null,
      paidAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  return { paid: true };
}

export async function getPaymentForBooking(
  bookingId: string,
): Promise<Payment | null> {
  const db = getDb();

  const payment = await db.query.payments.findFirst({
    where: eq(payments.bookingId, bookingId),
  });

  if (!payment) return null;

  return {
    id: payment.id,
    bookingId: payment.bookingId,
    stripePaymentIntentId: payment.stripePaymentIntentId ?? '',
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    refundedAmount: Number(payment.refundedAmount),
    createdAt: payment.createdAt.toISOString(),
  };
}
