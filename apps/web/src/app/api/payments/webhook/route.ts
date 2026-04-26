import { NextRequest } from 'next/server';
import Stripe from 'stripe';

import { errorResponse, successResponse } from '@/lib/api-response';
import { handleWebhookEvent } from '@/lib/services/payment';

function getStripe() {
  return new Stripe(process.env['STRIPE_SECRET_KEY']!);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return errorResponse(
        { code: 'BAD_REQUEST', message: 'Missing stripe-signature header' },
        400,
      );
    }

    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']!;

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      return errorResponse({ code: 'BAD_REQUEST', message: 'Invalid webhook signature' }, 400);
    }

    await handleWebhookEvent(
      event as unknown as { type: string; data: { object: Record<string, unknown> } },
    );

    return successResponse({ received: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Webhook processing failed' }, 500);
  }
}
