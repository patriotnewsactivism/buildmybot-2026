import { db } from '../db';
import { webhooks, webhookDeliveries, Webhook, InsertWebhookDelivery } from '../../shared/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export type WebhookEvent =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.status_changed'
  | 'conversation.started'
  | 'conversation.ended'
  | 'conversation.message'
  | 'bot.created'
  | 'bot.updated'
  | 'bot.deleted'
  | 'user.created'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled';

export interface WebhookPayload {
  event: WebhookEvent;
  data: any;
  timestamp: string;
  organizationId: string;
}

export class WebhookService {
  /**
   * Trigger a webhook event for an organization
   */
  async triggerEvent(
    organizationId: string,
    event: WebhookEvent,
    data: any
  ): Promise<void> {
    try {
      // Find all active webhooks for this organization that listen to this event
      const orgWebhooks = await db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.organizationId, organizationId),
            eq(webhooks.enabled, true)
          )
        );

      // Filter webhooks that are subscribed to this event
      const subscribedWebhooks = orgWebhooks.filter((webhook) => {
        const events = webhook.events as string[];
        return events.includes(event) || events.includes('*'); // * means all events
      });

      if (subscribedWebhooks.length === 0) {
        return; // No webhooks to trigger
      }

      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        organizationId,
      };

      // Create delivery records for each webhook
      for (const webhook of subscribedWebhooks) {
        await this.createDelivery(webhook, payload);
      }

      // Process deliveries asynchronously
      this.processDeliveries().catch((err) => {
        console.error('Error processing webhook deliveries:', err);
      });
    } catch (error) {
      console.error('Error triggering webhook event:', error);
    }
  }

  /**
   * Create a webhook delivery record
   */
  private async createDelivery(
    webhook: Webhook,
    payload: WebhookPayload
  ): Promise<void> {
    const delivery: InsertWebhookDelivery = {
      id: uuidv4(),
      webhookId: webhook.id,
      eventType: payload.event,
      payload,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    };

    await db.insert(webhookDeliveries).values(delivery);
  }

  /**
   * Process pending webhook deliveries
   */
  async processDeliveries(): Promise<void> {
    const now = new Date();

    // Get all pending deliveries or failed deliveries ready for retry
    const pendingDeliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          sql`${webhookDeliveries.status} IN ('pending', 'failed')`,
          sql`(${webhookDeliveries.nextRetryAt} IS NULL OR ${webhookDeliveries.nextRetryAt} <= ${now})`
        )
      )
      .limit(50); // Process in batches

    for (const delivery of pendingDeliveries) {
      await this.deliverWebhook(delivery);
    }
  }

  /**
   * Deliver a single webhook
   */
  private async deliverWebhook(delivery: any): Promise<void> {
    try {
      // Get the webhook configuration
      const [webhook] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, delivery.webhookId));

      if (!webhook || !webhook.enabled) {
        // Webhook was deleted or disabled
        await db
          .update(webhookDeliveries)
          .set({
            status: 'failed',
            errorMessage: 'Webhook disabled or deleted',
          })
          .where(eq(webhookDeliveries.id, delivery.id));
        return;
      }

      // Generate signature
      const signature = this.generateSignature(delivery.payload, webhook.secret);

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'BuildMyBot-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Delivery-ID': delivery.id,
        'X-Webhook-Timestamp': delivery.createdAt.toISOString(),
        ...(webhook.headers as Record<string, string> || {}),
      };

      // Send the webhook
      const startTime = Date.now();
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseBody = await response.text().catch(() => '');
      const duration = Date.now() - startTime;

      if (response.ok) {
        // Success
        await db
          .update(webhookDeliveries)
          .set({
            status: 'success',
            statusCode: response.status,
            responseBody: responseBody.substring(0, 1000), // Limit response size
            deliveredAt: new Date(),
            attempts: delivery.attempts + 1,
          })
          .where(eq(webhookDeliveries.id, delivery.id));
      } else {
        // Failed, schedule retry if enabled
        await this.handleFailedDelivery(
          delivery,
          webhook,
          response.status,
          responseBody
        );
      }
    } catch (error: any) {
      // Network error or timeout
      const [webhook] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, delivery.webhookId));

      if (webhook) {
        await this.handleFailedDelivery(
          delivery,
          webhook,
          0,
          error.message || 'Network error'
        );
      }
    }
  }

  /**
   * Handle failed webhook delivery
   */
  private async handleFailedDelivery(
    delivery: any,
    webhook: Webhook,
    statusCode: number,
    errorMessage: string
  ): Promise<void> {
    const attempts = delivery.attempts + 1;
    const maxRetries = webhook.maxRetries || 3;

    if (webhook.retryEnabled && attempts < maxRetries) {
      // Calculate next retry time using exponential backoff
      // 1 minute, 5 minutes, 30 minutes
      const backoffMinutes = [1, 5, 30][attempts - 1] || 60;
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await db
        .update(webhookDeliveries)
        .set({
          status: 'failed',
          statusCode,
          errorMessage: errorMessage.substring(0, 1000),
          attempts,
          nextRetryAt,
        })
        .where(eq(webhookDeliveries.id, delivery.id));
    } else {
      // Max retries exceeded or retry disabled
      await db
        .update(webhookDeliveries)
        .set({
          status: 'failed',
          statusCode,
          errorMessage: errorMessage.substring(0, 1000),
          attempts,
        })
        .where(eq(webhookDeliveries.id, delivery.id));
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(JSON.parse(payload), secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Get webhook deliveries for a webhook
   */
  async getDeliveries(
    webhookId: string,
    limit: number = 50
  ): Promise<any[]> {
    return await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(sql`${webhookDeliveries.createdAt} DESC`)
      .limit(limit);
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, deliveryId));

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    // Reset status to pending and clear retry time
    await db
      .update(webhookDeliveries)
      .set({
        status: 'pending',
        nextRetryAt: null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    // Process immediately
    await this.deliverWebhook(delivery);
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

// Start background worker for processing deliveries
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    webhookService.processDeliveries().catch((err) => {
      console.error('Webhook processing error:', err);
    });
  }, 60000); // Check every minute
}
