import Stripe from 'stripe';

function getStripeKeys() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_PUBLISHABLE_KEY');
  }

  return { secretKey, publishableKey };
}

export async function getUncachableStripeClient() {
  const { secretKey } = getStripeKeys();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil' as any,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = getStripeKeys();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = getStripeKeys();
  return secretKey;
}
