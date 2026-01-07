import { db } from '../db';
import { analyticsEvents, AnalyticsEvent, InsertAnalyticsEvent, conversations, leads, bots } from '../../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { and, gte, lte, sql } from 'drizzle-orm';

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
    let query = db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.organizationId, organizationId));

    if (startDate) {
      query = query.where(gte(analyticsEvents.createdAt, startDate));
    }

    if (endDate) {
      query = query.where(lte(analyticsEvents.createdAt, endDate));
    }

    return query
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  }

  async getConversionMetrics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConversionMetrics> {
    let conversationQuery = db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId));

    let leadQuery = db
      .select({
        count: count(),
        avgScore: sql<number>`AVG(${leads.score})`
      })
      .from(leads)
      .where(eq(leads.organizationId, organizationId));

    if (startDate) {
      conversationQuery = conversationQuery.where(gte(conversations.timestamp, startDate));
      leadQuery = leadQuery.where(gte(leads.createdAt, startDate));
    }

    if (endDate) {
      conversationQuery = conversationQuery.where(lte(conversations.timestamp, endDate));
      leadQuery = leadQuery.where(lte(leads.createdAt, endDate));
    }

    const [conversationResult] = await conversationQuery;
    const [leadResult] = await leadQuery;

    const totalConversations = conversationResult?.count || 0;
    const totalLeads = leadResult?.count || 0;
    const averageScore = leadResult?.avgScore || 0;

    return {
      totalConversations,
      totalLeads,
      conversionRate: totalConversations > 0 ? (totalLeads / totalConversations) * 100 : 0,
      averageScore,
    };
  }

  async getBotPerformance(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BotPerformance[]> {
    const orgBots = await db
      .select()
      .from(bots)
      .where(eq(bots.organizationId, organizationId));

    const performance: BotPerformance[] = [];

    for (const bot of orgBots) {
      let conversationQuery = db
        .select({ count: count() })
        .from(conversations)
        .where(eq(conversations.botId, bot.id));

      let leadQuery = db
        .select({ count: count() })
        .from(leads)
        .where(eq(leads.sourceBotId, bot.id));

      if (startDate) {
        conversationQuery = conversationQuery.where(gte(conversations.timestamp, startDate));
        leadQuery = leadQuery.where(gte(leads.createdAt, startDate));
      }

      if (endDate) {
        conversationQuery = conversationQuery.where(lte(conversations.timestamp, endDate));
        leadQuery = leadQuery.where(lte(leads.createdAt, endDate));
      }

      const [convResult] = await conversationQuery;
      const [leadResult] = await leadQuery;

      const conversationCount = convResult?.count || 0;
      const leadCount = leadResult?.count || 0;

      performance.push({
        botId: bot.id,
        botName: bot.name,
        conversationCount,
        leadCount,
        conversionRate: conversationCount > 0 ? (leadCount / conversationCount) * 100 : 0,
      });
    }

    return performance.sort((a, b) => b.conversionRate - a.conversionRate);
  }

  async getTimeSeriesData(
    organizationId: string,
    days: number = 30
  ): Promise<TimeSeriesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyConversations = await db
      .select({
        date: sql<string>`DATE(${conversations.timestamp})`,
        count: count(),
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.organizationId, organizationId),
          gte(conversations.timestamp, startDate)
        )
      )
      .groupBy(sql`DATE(${conversations.timestamp})`);

    const dailyLeads = await db
      .select({
        date: sql<string>`DATE(${leads.createdAt})`,
        count: count(),
      })
      .from(leads)
      .where(
        and(
          eq(leads.organizationId, organizationId),
          gte(leads.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${leads.createdAt})`);

    const dateMap = new Map<string, TimeSeriesData>();

    for (const conv of dailyConversations) {
      dateMap.set(conv.date, {
        date: conv.date,
        conversations: conv.count,
        leads: 0,
        conversionRate: 0,
      });
    }

    for (const lead of dailyLeads) {
      const existing = dateMap.get(lead.date);
      if (existing) {
        existing.leads = lead.count;
        existing.conversionRate = (lead.count / existing.conversations) * 100;
      } else {
        dateMap.set(lead.date, {
          date: lead.date,
          conversations: 0,
          leads: lead.count,
          conversionRate: 0,
        });
      }
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getEventsByType(
    organizationId: string,
    eventType: string,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    return db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.organizationId, organizationId),
          eq(analyticsEvents.eventType, eventType)
        )
      )
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  }

  async getEventsByBot(
    botId: string,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    return db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.botId, botId))
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(limit);
  }
}
