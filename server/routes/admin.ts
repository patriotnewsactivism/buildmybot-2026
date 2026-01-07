import { Router } from 'express';
import { eq, and, isNull, desc, sql, inArray, gte, SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import {
  users,
  bots,
  leads,
  conversations,
  partnerClients,
  partnerPayouts,
  impersonationSessions,
  featureFlags,
  systemSettings,
  emailTemplates,
  marketingMaterials,
  supportTickets,
  botDocuments,
} from '../../shared/schema';
import { systemMetricsService } from '../services/SystemMetricsService';
import { stripeService } from '../stripeService';
import { getUncachableStripeClient } from '../stripeClient';
import { PLANS, RESELLER_TIERS } from '../../constants';
import { auditSensitiveAction } from '../middleware';

const router = Router();

router.get('/metrics', async (_req, res) => {
  try {
    const metrics = systemMetricsService.getSnapshot();
    const activeThreshold = new Date(Date.now() - 15 * 60 * 1000);
    const [{ count: totalUsers }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(isNull(users.deletedAt));

    const [{ count: activeUsers }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.lastLoginAt, activeThreshold)));

    const mrrCents = (await db.select().from(users).where(isNull(users.deletedAt)))
      .reduce((sum, user) => sum + (PLANS[user.plan as keyof typeof PLANS]?.price || 0), 0) * 100;

    res.json({
      ...metrics,
      totalUsers,
      activeUsers,
      mrrCents,
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({ error: 'Failed to load metrics' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { search, status, role, limit = '50', offset = '0' } = req.query;
    const conditions: SQL[] = [isNull(users.deletedAt)];
    if (status) {
      conditions.push(eq(users.status, status as string));
    }
    if (role) {
      conditions.push(eq(users.role, role as string));
    }
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        sql`${users.name} ILIKE ${searchPattern} OR ${users.email} ILIKE ${searchPattern} OR ${users.companyName} ILIKE ${searchPattern}`
      );
    }

    const result = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));
    res.json(result);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users/bulk', auditSensitiveAction('users.bulk'), async (req, res) => {
  try {
    const { userIds, action } = req.body as { userIds: string[]; action: string };
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds required' });
    }

    if (action === 'suspend') {
      await db.update(users).set({ status: 'Suspended' }).where(inArray(users.id, userIds));
    } else if (action === 'activate') {
      await db.update(users).set({ status: 'Active' }).where(inArray(users.id, userIds));
    } else if (action === 'delete') {
      await db.update(users).set({ deletedAt: new Date() }).where(inArray(users.id, userIds));
    } else if (action === 'restore') {
      await db.update(users).set({ deletedAt: null }).where(inArray(users.id, userIds));
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error('Bulk user update error:', error);
    res.status(500).json({ error: 'Failed to update users' });
  }
});

router.get('/users/:id/usage', async (req, res) => {
  try {
    const userId = req.params.id;
    const [botCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(bots)
      .where(eq(bots.userId, userId));
    const [leadCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(leads)
      .where(eq(leads.userId, userId));
    const [conversationCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    res.json({
      botCount: botCount?.count || 0,
      leadCount: leadCount?.count || 0,
      conversationCount: conversationCount?.count || 0,
      lastLoginAt: user?.lastLoginAt || null,
    });
  } catch (error) {
    console.error('User usage error:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

router.get('/users/:id/export', async (req, res) => {
  try {
    const userId = req.params.id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userBots = await db.select().from(bots).where(eq(bots.userId, userId));
    const userLeads = await db.select().from(leads).where(eq(leads.userId, userId));
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId));
    const documents = await db
      .select()
      .from(botDocuments)
      .where(inArray(botDocuments.botId, userBots.map((bot) => bot.id)));

    res.json({
      user,
      bots: userBots,
      leads: userLeads,
      conversations: userConversations,
      documents,
    });
  } catch (error) {
    console.error('User export error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

router.post('/users/merge', auditSensitiveAction('users.merge'), async (req, res) => {
  try {
    const { sourceUserId, targetUserId, deleteSource = true } = req.body;
    if (!sourceUserId || !targetUserId) {
      return res.status(400).json({ error: 'sourceUserId and targetUserId required' });
    }

    if (sourceUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot merge the same user' });
    }

    await db.update(bots).set({ userId: targetUserId }).where(eq(bots.userId, sourceUserId));
    await db.update(leads).set({ userId: targetUserId }).where(eq(leads.userId, sourceUserId));
    await db.update(conversations).set({ userId: targetUserId }).where(eq(conversations.userId, sourceUserId));
    await db.update(partnerClients).set({ partnerId: targetUserId }).where(eq(partnerClients.partnerId, sourceUserId));
    await db.update(partnerClients).set({ clientId: targetUserId }).where(eq(partnerClients.clientId, sourceUserId));

    if (deleteSource) {
      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, sourceUserId));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('User merge error:', error);
    res.status(500).json({ error: 'Failed to merge users' });
  }
});

router.post('/users/:id/impersonate', auditSensitiveAction('users.impersonate'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { reason, durationMinutes = 30 } = req.body as { reason: string; durationMinutes?: number };

    if (!reason) {
      return res.status(400).json({ error: 'Impersonation reason required' });
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const sessionId = uuidv4();

    await db.insert(impersonationSessions).values({
      id: sessionId,
      actorUserId: (req as any).user.id,
      targetUserId,
      reason,
      expiresAt,
      createdAt: new Date(),
    });

    res.json({ token: sessionId, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

router.get('/partners', async (_req, res) => {
  try {
    const partners = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'RESELLER'), isNull(users.deletedAt)));

    const partnerMetrics = await Promise.all(
      partners.map(async (partner) => {
        const clients = await db
          .select()
          .from(users)
          .where(eq(users.referredBy, partner.resellerCode || ''));

        const totalRevenue = clients.reduce((sum, client) => {
          const price = PLANS[client.plan as keyof typeof PLANS]?.price || 0;
          return sum + price;
        }, 0);

        const currentTier = RESELLER_TIERS.find(
          (tier) => clients.length >= tier.min && clients.length <= tier.max
        ) || RESELLER_TIERS[0];

        return {
          partner,
          clientCount: clients.length,
          totalRevenue,
          tier: currentTier.label,
        };
      })
    );

    res.json(partnerMetrics);
  } catch (error) {
    console.error('Partner list error:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

router.post('/partners/:id/approve', auditSensitiveAction('partners.approve'), async (req, res) => {
  try {
    const [updated] = await db
      .update(users)
      .set({ status: 'Active' })
      .where(eq(users.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Partner approve error:', error);
    res.status(500).json({ error: 'Failed to approve partner' });
  }
});

router.get('/partners/leaderboard', async (_req, res) => {
  try {
    const partners = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'RESELLER'), isNull(users.deletedAt)));

    const leaderboard = partners.map((partner) => {
      const tier = RESELLER_TIERS.find(
        (currentTier) =>
          (partner.resellerClientCount || 0) >= currentTier.min &&
          (partner.resellerClientCount || 0) <= currentTier.max
      ) || RESELLER_TIERS[0];

      return {
        id: partner.id,
        name: partner.companyName,
        resellerCode: partner.resellerCode,
        clients: partner.resellerClientCount || 0,
        tier: tier.label,
      };
    });

    res.json(leaderboard.sort((a, b) => b.clients - a.clients));
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

router.get('/financial/overview', async (_req, res) => {
  try {
    const activeUsers = await db.select().from(users).where(and(isNull(users.deletedAt), eq(users.status, 'Active')));
    const mrr = activeUsers.reduce((sum, user) => sum + (PLANS[user.plan as keyof typeof PLANS]?.price || 0), 0);
    const churned = await db
      .select()
      .from(users)
      .where(and(isNull(users.deletedAt), eq(users.status, 'Suspended')));

    const churnRate = activeUsers.length > 0 ? Number(((churned.length / activeUsers.length) * 100).toFixed(2)) : 0;

    res.json({
      mrrCents: mrr * 100,
      arrCents: mrr * 12 * 100,
      churnRate,
      activeCustomers: activeUsers.length,
      churnedCustomers: churned.length,
    });
  } catch (error) {
    console.error('Financial overview error:', error);
    res.status(500).json({ error: 'Failed to load financial overview' });
  }
});

router.get('/financial/stripe-health', async (_req, res) => {
  try {
    const products = await stripeService.listProductsWithPrices();
    res.json({ ok: true, productCount: products.length });
  } catch (error) {
    console.error('Stripe health error:', error);
    res.status(500).json({ ok: false, error: 'Stripe connection failed' });
  }
});

router.get('/financial/invoices', async (_req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const invoices = await stripe.invoices.list({ limit: 20 });
    res.json(invoices.data);
  } catch (error) {
    console.error('Invoice list error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/financial/refunds', async (_req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const refunds = await stripe.refunds.list({ limit: 20 });
    res.json(refunds.data);
  } catch (error) {
    console.error('Refund list error:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

router.post('/financial/refunds', auditSensitiveAction('financial.refund'), async (req, res) => {
  try {
    const { paymentIntentId, chargeId, amountCents, reason } = req.body;
    const stripe = await getUncachableStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      charge: chargeId,
      amount: amountCents,
      reason,
    });
    res.json(refund);
  } catch (error) {
    console.error('Refund create error:', error);
    res.status(500).json({ error: 'Failed to create refund' });
  }
});

router.get('/system/settings', async (_req, res) => {
  try {
    let [settings] = await db.select().from(systemSettings);
    if (!settings) {
      const [created] = await db
        .insert(systemSettings)
        .values({
          id: uuidv4(),
          maintenanceMode: false,
          envOverrides: {},
          apiKeys: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      settings = created;
    }

    const flags = await db.select().from(featureFlags).orderBy(desc(featureFlags.updatedAt));
    const templates = await db.select().from(emailTemplates).orderBy(desc(emailTemplates.updatedAt));

    res.json({ settings, featureFlags: flags, emailTemplates: templates });
  } catch (error) {
    console.error('System settings error:', error);
    res.status(500).json({ error: 'Failed to load system settings' });
  }
});

router.put('/system/settings', auditSensitiveAction('system.settings.update'), async (req, res) => {
  try {
    const { maintenanceMode, envOverrides } = req.body;
    const [existing] = await db.select().from(systemSettings);
    const updates = {
      maintenanceMode: Boolean(maintenanceMode),
      envOverrides: envOverrides || {},
      updatedAt: new Date(),
    };

    const [updated] = existing
      ? await db.update(systemSettings).set(updates).where(eq(systemSettings.id, existing.id)).returning()
      : await db.insert(systemSettings).values({ id: uuidv4(), ...updates, apiKeys: {}, createdAt: new Date() }).returning();

    res.json(updated);
  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

router.post('/system/feature-flags', auditSensitiveAction('system.feature_flags.update'), async (req, res) => {
  try {
    const { key, description, enabled } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Feature flag key required' });
    }

    const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    const [flag] = existing
      ? await db.update(featureFlags).set({ description, enabled, updatedAt: new Date() }).where(eq(featureFlags.id, existing.id)).returning()
      : await db.insert(featureFlags).values({ id: uuidv4(), key, description, enabled: Boolean(enabled), createdAt: new Date(), updatedAt: new Date() }).returning();

    res.json(flag);
  } catch (error) {
    console.error('Feature flag error:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

router.post('/system/api-keys/rotate', auditSensitiveAction('system.api_keys.rotate'), async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name) {
      return res.status(400).json({ error: 'Key name required' });
    }

    let [settings] = await db.select().from(systemSettings);
    if (!settings) {
      const [created] = await db
        .insert(systemSettings)
        .values({
          id: uuidv4(),
          maintenanceMode: false,
          envOverrides: {},
          apiKeys: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      settings = created;
    }
    const apiKeys: Record<string, string> = { ...((settings?.apiKeys || {}) as Record<string, string>) };
    apiKeys[name] = uuidv4().replace(/-/g, '');

    const [updated] = await db
      .update(systemSettings)
      .set({ apiKeys, updatedAt: new Date() })
      .where(eq(systemSettings.id, settings.id))
      .returning();

    res.json({ key: apiKeys[name], settings: updated });
  } catch (error) {
    console.error('Rotate API key error:', error);
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
});

router.get('/support', async (_req, res) => {
  try {
    const tickets = await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.updatedAt));
    res.json(tickets);
  } catch (error) {
    console.error('Support ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

router.post('/support', async (req, res) => {
  try {
    const { organizationId, userId, subject, priority } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject required' });
    }

    const [ticket] = await db
      .insert(supportTickets)
      .values({
        id: uuidv4(),
        organizationId,
        userId,
        subject,
        priority: priority || 'normal',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.json(ticket);
  } catch (error) {
    console.error('Support ticket create error:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

router.get('/marketing/materials', async (_req, res) => {
  try {
    const materials = await db.select().from(marketingMaterials);
    res.json(materials);
  } catch (error) {
    console.error('Marketing materials error:', error);
    res.status(500).json({ error: 'Failed to fetch marketing materials' });
  }
});

router.post('/marketing/materials', async (req, res) => {
  try {
    const { title, description, type, size, downloadUrl, previewUrl } = req.body;
    if (!title || !type || !downloadUrl) {
      return res.status(400).json({ error: 'title, type, and downloadUrl required' });
    }

    const [material] = await db
      .insert(marketingMaterials)
      .values({
        id: uuidv4(),
        title,
        description,
        type,
        size,
        downloadUrl,
        previewUrl,
        createdAt: new Date(),
      })
      .returning();

    res.json(material);
  } catch (error) {
    console.error('Marketing material create error:', error);
    res.status(500).json({ error: 'Failed to create marketing material' });
  }
});

router.get('/payouts', async (_req, res) => {
  try {
    const payouts = await db
      .select()
      .from(partnerPayouts)
      .orderBy(desc(partnerPayouts.createdAt));
    res.json(payouts);
  } catch (error) {
    console.error('Payout list error:', error);
    res.status(500).json({ error: 'Failed to fetch payouts' });
  }
});

router.post('/payouts', auditSensitiveAction('partners.payout'), async (req, res) => {
  try {
    const { partnerId, amountCents, periodStart, periodEnd, method } = req.body;
    if (!partnerId || !amountCents) {
      return res.status(400).json({ error: 'partnerId and amountCents required' });
    }

    const [payout] = await db
      .insert(partnerPayouts)
      .values({
        id: uuidv4(),
        partnerId,
        amountCents,
        status: 'pending',
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        method: method || 'bank_transfer',
        createdAt: new Date(),
      })
      .returning();

    res.json(payout);
  } catch (error) {
    console.error('Payout create error:', error);
    res.status(500).json({ error: 'Failed to create payout' });
  }
});

router.get('/fraud-alerts', async (_req, res) => {
  try {
    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSignups = await db
      .select()
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, recentThreshold)));

    const domainCounts = new Map<string, number>();
    recentSignups.forEach((user) => {
      const domain = user.email.split('@')[1] || 'unknown';
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    });

    const flaggedDomains = Array.from(domainCounts.entries())
      .filter(([, count]) => count >= 5)
      .map(([domain, count]) => ({ domain, count }));

    res.json({ flaggedDomains });
  } catch (error) {
    console.error('Fraud alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
});

export default router;
