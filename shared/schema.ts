import { pgTable, text, varchar, integer, boolean, timestamp, json, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export * from './models/auth';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).default('OWNER'),
  plan: varchar('plan', { length: 50 }).default('FREE'),
  companyName: varchar('company_name', { length: 255 }).default(''),
  avatarUrl: text('avatar_url'),
  resellerCode: varchar('reseller_code', { length: 50 }),
  resellerClientCount: integer('reseller_client_count').default(0),
  customDomain: varchar('custom_domain', { length: 255 }),
  referredBy: varchar('referred_by', { length: 50 }),
  phoneConfig: json('phone_config'),
  status: varchar('status', { length: 50 }).default('Active'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  referralCredits: real('referral_credits').default(0),
  referralCreditsExpiry: timestamp('referral_credits_expiry'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bots = pgTable('bots', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).default('customer_support'),
  systemPrompt: text('system_prompt').default(''),
  model: varchar('model', { length: 100 }).default('gpt-4o-mini'),
  temperature: real('temperature').default(0.7),
  knowledgeBase: json('knowledge_base').default([]),
  active: boolean('active').default(true),
  conversationsCount: integer('conversations_count').default(0),
  themeColor: varchar('theme_color', { length: 50 }).default('#3B82F6'),
  websiteUrl: text('website_url'),
  maxMessages: integer('max_messages').default(1000),
  randomizeIdentity: boolean('randomize_identity').default(false),
  avatar: text('avatar'),
  responseDelay: integer('response_delay').default(500),
  embedType: varchar('embed_type', { length: 50 }).default('hover'),
  userId: text('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  score: integer('score').default(0),
  status: varchar('status', { length: 50 }).default('New'),
  sourceBotId: text('source_bot_id').references(() => bots.id),
  userId: text('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  botId: text('bot_id').references(() => bots.id),
  messages: json('messages').default([]),
  sentiment: varchar('sentiment', { length: 50 }).default('Neutral'),
  timestamp: timestamp('timestamp').defaultNow(),
  userId: text('user_id').references(() => users.id),
});

export const botDocuments = pgTable('bot_documents', {
  id: text('id').primaryKey(),
  botId: text('bot_id').references(() => bots.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  fileSize: integer('file_size').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  bots: many(bots),
  leads: many(leads),
  conversations: many(conversations),
}));

export const botsRelations = relations(bots, ({ one, many }) => ({
  user: one(users, {
    fields: [bots.userId],
    references: [users.id],
  }),
  leads: many(leads),
  conversations: many(conversations),
  documents: many(botDocuments),
}));

export const botDocumentsRelations = relations(botDocuments, ({ one }) => ({
  bot: one(bots, {
    fields: [botDocuments.botId],
    references: [bots.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  user: one(users, {
    fields: [leads.userId],
    references: [users.id],
  }),
  sourceBot: one(bots, {
    fields: [leads.sourceBotId],
    references: [bots.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  bot: one(bots, {
    fields: [conversations.botId],
    references: [bots.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Bot = typeof bots.$inferSelect;
export type InsertBot = typeof bots.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type BotDocument = typeof botDocuments.$inferSelect;
export type InsertBotDocument = typeof botDocuments.$inferInsert;
