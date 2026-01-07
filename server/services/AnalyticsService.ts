import { db } from '../db';
import { analyticsEvents, AnalyticsEvent, InsertAnalyticsEvent, conversations, leads, bots } from '../../shared/schema';
import { eq, and, gte, lte, desc, count, sql, SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface ConversionMetrics {
  totalConversations: number;
  totalLeads: number;
  conversionRate: number;
  averageScore: number;
}

export interface BotPerformance {
  botId: string;
  botName: string;
  conversationCount: number;
  leadCount: number;
  conversionRate: number;
}

export interface TimeSeriesData {
  date: string;
  conversations: number;
  leads: number;
  conversionRate: number;
}

export class AnalyticsService {
  async trackEvent(
    eventData: Omit<InsertAnalyticsEvent, 'id' | 'createdAt'>
  ): Promise<AnalyticsEvent> {
    const [event] = await db
      .insert(analyticsEvents)
      .values({
        id: uuidv4(),
        ...eventData,
        createdAt: new Date(),
      })
      .returning();

    return event;
  }

  async getEventsByOrganization(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    // Collect conditions in an array first
    const conditions: SQL[] = [eq(analyticsEvents.organizationId, organizationId)];

    if (startDate) {
      conditions.push(gte(analyticsEvents.createdAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(analyticsEvents.createdAt, endDate));
    }

    // Apply all conditions at once
    return db
      .select()
      .from(analyticsEvents)
      .where(and(...conditions))
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  }

  async getConversionMetrics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversionMetrics> {
    // Build condition arrays for each table
    const conversationConditions: SQL[] = [eq(conversations.organizationId, organizationId)];
    const leadConditions: SQL[] = [eq(leads.organizationId, organizationId)];

    if (startDate) {
      conversationConditions.push(gte(conversations.timestamp, startDate));
      leadConditions.push(gte(leads.createdAt, startDate));
    }

    if (endDate) {
      conversationConditions.push(lte(conversations.timestamp, endDate));
      leadConditions.push(lte(leads.createdAt, endDate));
    }

    // Execute queries with the collected conditions
    const [conversationResult] = await db
      .select({ count: count() })
      .from(conversations)
      .where(and(...conversationConditions));

    const [leadResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(and(...leadConditions));

    const totalConversations = Number(conversationResult?.count || 0);
    const totalLeads = Number(leadResult?.count || 0);

    // Calculate average lead score
    const avgScoreResult = await db
      .select({ avg: sql<number>`AVG(${leads.score})` })
      .from(leads)
      .where(and(...leadConditions));

    const averageScore = Number(avgScoreResult[0]?.avg || 0);
    const conversionRate = totalConversations > 0 ? totalLeads / totalConversations : 0;

    return {
      totalConversations,
      totalLeads,
      conversionRate,
      averageScore,
    };
  }

  async getBotPerformance(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BotPerformance[]> {
    const allBots = await db
      .select()
      .from(bots)
      .where(eq(bots.organizationId, organizationId));

    const performance: BotPerformance[] = [];

    for (const bot of allBots) {
      const conversationConditions: SQL[] = [eq(conversations.botId, bot.id)];
      const leadConditions: SQL[] = [eq(leads.botId, bot.id)];

      if (startDate) {
        conversationConditions.push(gte(conversations.timestamp, startDate));
        leadConditions.push(gte(leads.createdAt, startDate));
      }

      if (endDate) {
        conversationConditions.push(lte(conversations.timestamp, endDate));
        leadConditions.push(lte(leads.createdAt, endDate));
      }

      const [conversationResult] = await db
        .select({ count: count() })
        .from(conversations)
        .where(and(...conversationConditions));

      const [leadResult] = await db
        .select({ count: count() })
        .from(leads)
        .where(and(...leadConditions));

      const conversationCount = Number(conversationResult?.count || 0);
      const leadCount = Number(leadResult?.count || 0);

      performance.push({
        botId: bot.id,
        botName: bot.name,
        conversationCount,
        leadCount,
        conversionRate: conversationCount > 0 ? leadCount / conversationCount : 0,
      });
    }

    return performance;
  }

  async getTimeSeriesData(
    organizationId: string,
    days: number = 30
  ): Promise<TimeSeriesData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const timeSeries: TimeSeriesData[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const conversationConditions: SQL[] = [
        eq(conversations.organizationId, organizationId),
        gte(conversations.timestamp, date),
        lte(conversations.timestamp, nextDate),
      ];

      const leadConditions: SQL[] = [
        eq(leads.organizationId, organizationId),
        gte(leads.createdAt, date),
        lte(leads.createdAt, nextDate),
      ];

      const [conversationResult] = await db
        .select({ count: count() })
        .from(conversations)
        .where(and(...conversationConditions));

      const [leadResult] = await db
        .select({ count: count() })
        .from(leads)
        .where(and(...leadConditions));

      const conversationCount = Number(conversationResult?.count || 0);
      const leadCount = Number(leadResult?.count || 0);

      timeSeries.push({
        date: date.toISOString().split('T')[0],
        conversations: conversationCount,
        leads: leadCount,
        conversionRate: conversationCount > 0 ? leadCount / conversationCount : 0,
      });
    }

    return timeSeries;
  }
}
