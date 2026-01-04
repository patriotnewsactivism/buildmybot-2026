import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

const PLAN_PRICES: Record<string, number> = {
  'FREE': 0,
  'STARTER': 29,
  'PROFESSIONAL': 99,
  'EXECUTIVE': 199,
  'ENTERPRISE': 499
};

export class StripeService {
  async createCustomer(email: string, userId: string, name?: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true) {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = ${active}
        ORDER BY pr.unit_amount ASC
      `
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }) {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user;
  }

  async creditReferrer(referredUserId: string, plan: string): Promise<{ success: boolean; credited: number; referrerId?: string }> {
    const [referredUser] = await db.select().from(users).where(eq(users.id, referredUserId));
    
    if (!referredUser || !referredUser.referredBy) {
      return { success: false, credited: 0 };
    }

    const [referrer] = await db.select().from(users).where(eq(users.resellerCode, referredUser.referredBy));
    
    if (!referrer) {
      return { success: false, credited: 0 };
    }

    const planPrice = PLAN_PRICES[plan.toUpperCase()] || 0;
    if (planPrice === 0) {
      return { success: false, credited: 0 };
    }

    const creditAmount = planPrice;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 12);

    const currentCredits = referrer.referralCredits || 0;
    const newCredits = currentCredits + creditAmount;

    await db.update(users).set({
      referralCredits: newCredits,
      referralCreditsExpiry: expiryDate
    }).where(eq(users.id, referrer.id));

    return { 
      success: true, 
      credited: creditAmount, 
      referrerId: referrer.id 
    };
  }

  async getUserCredits(userId: string): Promise<{ credits: number; expiry: Date | null }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return {
      credits: user?.referralCredits || 0,
      expiry: user?.referralCreditsExpiry || null
    };
  }

  async applyCreditsToSubscription(userId: string, amount: number): Promise<{ success: boolean; remainingCredits: number }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user || (user.referralCredits || 0) < amount) {
      return { success: false, remainingCredits: user?.referralCredits || 0 };
    }

    const newCredits = (user.referralCredits || 0) - amount;
    await db.update(users).set({ referralCredits: newCredits }).where(eq(users.id, userId));

    return { success: true, remainingCredits: newCredits };
  }
}

export const stripeService = new StripeService();
