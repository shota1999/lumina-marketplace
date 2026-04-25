import Stripe from 'stripe';

function createStripeClient(): Stripe {
  const secretKey = process.env['STRIPE_SECRET_KEY'];
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }

  return new Stripe(secretKey, {
    typescript: true,
  });
}

let stripeInstance: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = createStripeClient();
  }
  return stripeInstance;
}

export const STRIPE_PUBLISHABLE_KEY =
  process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] ?? '';
