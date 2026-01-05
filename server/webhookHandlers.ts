import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { getStripeSecretKey, getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '../shared/schema';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return;
    }

    const secretKey = await getStripeSecretKey();
    const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error);
      return;
    }

    await WebhookHandlers.processWhitelabelEvent(event);
  }

  private static async processWhitelabelEvent(event: Stripe.Event): Promise<void> {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.purpose !== 'whitelabel_fee') {
        return;
      }
      const userId = session.metadata?.userId;
      if (!userId) {
        return;
      }

      const updates: Record<string, unknown> = {
        whitelabelEnabled: true,
      };

      if (session.subscription) {
        updates.whitelabelSubscriptionId = session.subscription.toString();
      }
      if (session.customer) {
        updates.stripeCustomerId = session.customer.toString();
      }

      await db.update(users).set(updates).where(eq(users.id, userId));
      return;
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription?.toString();
      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      if (!subscriptionId || !periodEnd) {
        return;
      }

      const paidThrough = new Date(periodEnd * 1000);
      await db
        .update(users)
        .set({ whitelabelPaidThrough: paidThrough })
        .where(eq(users.whitelabelSubscriptionId, subscriptionId));
    }
  }
}
