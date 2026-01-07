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

    const [leadResult]