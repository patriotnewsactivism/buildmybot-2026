import { Router } from 'express';
import { db } from '../db';
import { webhooks, webhookDeliveries, Webhook, InsertWebhook } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { webhookService } from '../services/WebhookService';
import { authenticate, AuthRequest } from '../middleware';

const router = Router();

// Apply authentication to all webhook routes
router.use(authenticate);

// ========================================
// GET /api/webhooks
// List all webhooks for the authenticated user's organization
// ========================================
router.get('/', async (req: AuthRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const orgWebhooks = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.organizationId, organizationId))
      .orderBy(desc(webhooks.createdAt));

    res.json(orgWebhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

// ========================================
// POST /api/webhooks
// Create a new webhook
// ========================================
router.post('/', async (req: AuthRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const { name, url, events, description, headers, retryEnabled, maxRetries } = req.body;

    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Missing required fields: name, url, and events array'
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Generate a secure secret for this webhook
    const secret = crypto.randomBytes(32).toString('hex');

    const newWebhook: InsertWebhook = {
      id: uuidv4(),
      organizationId,
      name,
      url,
      secret,
      events,
      enabled: true,
      description: description || null,
      headers: headers || {},
      retryEnabled: retryEnabled !== false, // Default to true
      maxRetries: maxRetries || 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db
      .insert(webhooks)
      .values(newWebhook)
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// ========================================
// GET /api/webhooks/:id
// Get a specific webhook
// ========================================
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, id),
          eq(webhooks.organizationId, organizationId!)
        )
      );

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json(webhook);
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook' });
  }
});

// ========================================
// PUT /api/webhooks/:id
// Update a webhook
// ========================================
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const { name, url, events, description, headers, enabled, retryEnabled, maxRetries } = req.body;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, id),
          eq(webhooks.organizationId, organizationId!)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }

    const updates: Partial<Webhook> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (description !== undefined) updates.description = description;
    if (headers !== undefined) updates.headers = headers;
    if (enabled !== undefined) updates.enabled = enabled;
    if (retryEnabled !== undefined) updates.retryEnabled = retryEnabled;
    if (maxRetries !== undefined) updates.maxRetries = maxRetries;

    const [updated] = await db
      .update(webhooks)
      .set(updates)
      .where(eq(webhooks.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// ========================================
// DELETE /api/webhooks/:id
// Delete a webhook
// ========================================
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, id),
          eq(webhooks.organizationId, organizationId!)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await db
      .delete(webhooks)
      .where(eq(webhooks.id, id));

    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// ========================================
// GET /api/webhooks/:id/deliveries
// Get delivery history for a webhook
// ========================================
router.get('/:id/deliveries', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify webhook ownership
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, id),
          eq(webhooks.organizationId, organizationId!)
        )
      );

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const deliveries = await webhookService.getDeliveries(id, limit);

    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// ========================================
// POST /api/webhooks/:id/test
// Test a webhook by sending a test event
// ========================================
router.post('/:id/test', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    // Verify webhook ownership
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, id),
          eq(webhooks.organizationId, organizationId!)
        )
      );

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Trigger a test event
    await webhookService.triggerEvent(
      organizationId!,
      'conversation.message',
      {
        test: true,
        message: 'This is a test webhook from BuildMyBot',
        timestamp: new Date().toISOString(),
      }
    );

    res.json({
      success: true,
      message: 'Test webhook triggered. Check deliveries for results.'
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// ========================================
// POST /api/webhooks/deliveries/:deliveryId/retry
// Retry a failed webhook delivery
// ========================================
router.post('/deliveries/:deliveryId/retry', async (req: AuthRequest, res) => {
  try {
    const { deliveryId } = req.params;
    const organizationId = req.user?.organizationId;

    // Get the delivery
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, deliveryId));

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Verify webhook ownership
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, delivery.webhookId),
          eq(webhooks.organizationId, organizationId!)
        )
      );

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await webhookService.retryDelivery(deliveryId);

    res.json({ success: true, message: 'Delivery retry initiated' });
  } catch (error) {
    console.error('Error retrying delivery:', error);
    res.status(500).json({ error: 'Failed to retry delivery' });
  }
});

// ========================================
// POST /api/webhooks/:id/regenerate-secret
// Regenerate webhook secret
// ========================================
router.post('/:id/regenerate-secret', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    // Verify webhook ownership
    const [existing] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, id),
          eq(webhooks.organizationId, organizationId!)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');

    const [updated] = await db
      .update(webhooks)
      .set({
        secret: newSecret,
        updatedAt: new Date()
      })
      .where(eq(webhooks.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error regenerating secret:', error);
    res.status(500).json({ error: 'Failed to regenerate secret' });
  }
});

export default router;
