// Load environment variables first
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { db } from './db';
import { users, bots, leads, conversations, botDocuments } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getStripePublishableKey } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { stripeService } from './stripeService';
import { PLANS, RESELLER_TIERS, WHITELABEL_FEE } from '../constants';
import multer from 'multer';
import { securityHeaders, apiLimiter, metricsMiddleware, authenticate, loadOrganizationContext, tenantIsolation, applyImpersonation, authorize } from './middleware';
import { auditRouter, analyticsRouter, organizationsRouter, adminRouter, partnersRouter, clientsRouter, impersonationRouter, templatesRouter, channelsRouter } from './routes';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const allowedExtensions = ['.pdf', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy to properly handle X-Forwarded-For header for rate limiting
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? 5000 : parseInt(process.env.API_PORT || '3001', 10);

function getBaseUrl() {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl) {
    return appBaseUrl.replace(/\/+$/, '');
  }

  return null;
}

// Stripe is configured via environment variables
// Webhook endpoint is available at /api/stripe/webhook

app.use(cors());

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json());

// Phase 1: Apply security headers
app.use(securityHeaders);

// Phase 1: Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Metrics collection
app.use(metricsMiddleware);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/stripe/publishable-key', async (req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get publishable key' });
  }
});

app.get('/api/stripe/products', async (req, res) => {
  try {
    const products = await stripeService.listProductsWithPrices();
    const productsMap = new Map();
    for (const row of products as any[]) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata,
          prices: []
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }
    res.json({ data: Array.from(productsMap.values()) });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { userId, priceId } = req.body;
    if (!userId || !priceId) {
      return res.status(400).json({ error: 'Missing userId or priceId' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email, user.id, user.name);
      await stripeService.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return res.status(500).json({ error: 'APP_BASE_URL must be set for Stripe redirects' });
    }
    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/billing?canceled=true`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/stripe/whitelabel/checkout', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const priceId = process.env.STRIPE_WHITELABEL_PRICE_ID;
    if (!priceId) {
      return res.status(500).json({ error: 'STRIPE_WHITELABEL_PRICE_ID must be set' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email, user.id, user.name);
      await stripeService.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return res.status(500).json({ error: 'APP_BASE_URL must be set for Stripe redirects' });
    }

    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/?whitelabel=success`,
      `${baseUrl}/?whitelabel=canceled`,
      {
        metadata: {
          purpose: 'whitelabel_fee',
          userId,
        },
        subscriptionMetadata: {
          purpose: 'whitelabel_fee',
          userId,
        },
      }
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating whitelabel checkout session:', error);
    res.status(500).json({ error: 'Failed to create whitelabel checkout session' });
  }
});

app.post('/api/stripe/portal', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return res.status(500).json({ error: 'APP_BASE_URL must be set for Stripe redirects' });
    }
    const session = await stripeService.createCustomerPortalSession(
      user.stripeCustomerId,
      `${baseUrl}/billing`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

const apiAuthStack = [authenticate, applyImpersonation, loadOrganizationContext, tenantIsolation];

app.get('/api/bots', ...apiAuthStack, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    let allBots;
    if (userId) {
      allBots = await db.select().from(bots).where(eq(bots.userId, userId));
    } else {
      allBots = await db.select().from(bots);
    }
    res.json(allBots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

app.get('/api/bots/:id', ...apiAuthStack, async (req, res) => {
  try {
    const [bot] = await db.select().from(bots).where(eq(bots.id, req.params.id));
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    res.json(bot);
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

app.post('/api/bots', ...apiAuthStack, async (req, res) => {
  try {
    const botData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date(),
    };
    const [newBot] = await db.insert(bots).values(botData).returning();
    res.json(newBot);
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

app.put('/api/bots/:id', ...apiAuthStack, async (req, res) => {
  try {
    const [updatedBot] = await db
      .update(bots)
      .set(req.body)
      .where(eq(bots.id, req.params.id))
      .returning();
    res.json(updatedBot);
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

app.get('/api/leads', ...apiAuthStack, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    let allLeads;
    if (userId) {
      allLeads = await db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
    } else {
      allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
    }
    res.json(allLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.post('/api/leads', ...apiAuthStack, async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date(),
    };
    const [newLead] = await db.insert(leads).values(leadData).returning();
    res.json(newLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

app.get('/api/users', ...apiAuthStack, async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', ...apiAuthStack, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/api/users', ...apiAuthStack, async (req, res) => {
  try {
    const userData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date(),
    };
    const [newUser] = await db.insert(users).values(userData).returning();
    res.json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', ...apiAuthStack, async (req, res) => {
  try {
    const [updatedUser] = await db
      .update(users)
      .set(req.body)
      .where(eq(users.id, req.params.id))
      .returning();
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.get('/api/users/referrals/:code', ...apiAuthStack, async (req, res) => {
  try {
    const referrals = await db
      .select()
      .from(users)
      .where(eq(users.referredBy, req.params.code));
    res.json(referrals);
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

app.get('/api/resellers/:code/summary', ...apiAuthStack, async (req, res) => {
  try {
    const [reseller] = await db
      .select()
      .from(users)
      .where(eq(users.resellerCode, req.params.code));

    if (!reseller) {
      return res.status(404).json({ error: 'Reseller not found' });
    }

    const referrals = await db
      .select()
      .from(users)
      .where(eq(users.referredBy, req.params.code));

    const clientCount = referrals.length;
    const totalRevenue = referrals.reduce((acc, user) => {
      const plan = PLANS[user.plan as keyof typeof PLANS];
      return acc + (plan?.price || 0);
    }, 0);

    const whitelabelEnabled = Boolean(reseller.whitelabelEnabled);
    const paidThrough = reseller.whitelabelPaidThrough
      ? new Date(reseller.whitelabelPaidThrough)
      : null;
    const whitelabelFeeDue = whitelabelEnabled && (!paidThrough || paidThrough.getTime() < Date.now());

    const currentTier = RESELLER_TIERS.find(
      (tier) => clientCount >= tier.min && clientCount <= tier.max
    ) || RESELLER_TIERS[0];

    const commissionRate = whitelabelEnabled
      ? WHITELABEL_FEE.commission
      : currentTier.commission;
    const grossCommission = totalRevenue * commissionRate;
    const whitelabelFeeAmount = whitelabelFeeDue ? WHITELABEL_FEE.price : 0;
    const pendingPayout = Math.max(grossCommission - whitelabelFeeAmount, 0);

    res.json({
      users: referrals,
      stats: {
        totalClients: clientCount,
        totalRevenue,
        commissionRate,
        grossCommission,
        pendingPayout,
        whitelabelFeeDue,
        whitelabelFeeAmount,
        whitelabelPaidThrough: paidThrough ? paidThrough.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Error fetching reseller summary:', error);
    res.status(500).json({ error: 'Failed to fetch reseller summary' });
  }
});

app.get('/api/users/:id/credits', ...apiAuthStack, async (req, res) => {
  try {
    const credits = await stripeService.getUserCredits(req.params.id);
    res.json(credits);
  } catch (error) {
    console.error('Error fetching user credits:', error);
    res.status(500).json({ error: 'Failed to fetch user credits' });
  }
});

app.post('/api/referral/credit', ...apiAuthStack, async (req, res) => {
  try {
    const { referredUserId, plan } = req.body;
    if (!referredUserId || !plan) {
      return res.status(400).json({ error: 'referredUserId and plan are required' });
    }
    const result = await stripeService.creditReferrer(referredUserId, plan);
    res.json(result);
  } catch (error) {
    console.error('Error crediting referrer:', error);
    res.status(500).json({ error: 'Failed to credit referrer' });
  }
});

app.post('/api/users/:id/apply-credits', ...apiAuthStack, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    const result = await stripeService.applyCreditsToSubscription(req.params.id, amount);
    res.json(result);
  } catch (error) {
    console.error('Error applying credits:', error);
    res.status(500).json({ error: 'Failed to apply credits' });
  }
});

app.get('/api/conversations', ...apiAuthStack, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    let allConversations;
    if (userId) {
      allConversations = await db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.timestamp));
    } else {
      allConversations = await db.select().from(conversations).orderBy(desc(conversations.timestamp));
    }
    res.json(allConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.get('/api/conversations/:id', ...apiAuthStack, async (req, res) => {
  try {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, req.params.id));
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

app.post('/api/conversations', ...apiAuthStack, async (req, res) => {
  try {
    const conversationData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      timestamp: new Date(),
    };
    const [newConversation] = await db.insert(conversations).values(conversationData).returning();
    res.json(newConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

app.put('/api/conversations/:id', ...apiAuthStack, async (req, res) => {
  try {
    const [updatedConversation] = await db
      .update(conversations)
      .set(req.body)
      .where(eq(conversations.id, req.params.id))
      .returning();
    res.json(updatedConversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

app.post('/api/bots/:botId/documents', ...apiAuthStack, upload.single('file'), async (req, res) => {
  try {
    const userId = req.query.userId as string || req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { botId } = req.params;
    
    // Verify bot exists and belongs to user
    const [bot] = await db.select().from(bots).where(eq(bots.id, botId));
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    if (bot.userId && bot.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to upload documents to this bot' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    
    const documentData = {
      id: uuidv4(),
      botId,
      fileName: req.file.originalname,
      fileType: ext,
      fileSize: req.file.size,
      content: null,
      createdAt: new Date(),
    };

    const [newDocument] = await db.insert(botDocuments).values(documentData).returning();
    res.json(newDocument);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

app.get('/api/bots/:botId/documents', ...apiAuthStack, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { botId } = req.params;
    
    // Verify bot exists and belongs to user
    const [bot] = await db.select().from(bots).where(eq(bots.id, botId));
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    if (bot.userId && bot.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view documents for this bot' });
    }

    const documents = await db.select().from(botDocuments).where(eq(botDocuments.botId, botId)).orderBy(desc(botDocuments.createdAt));
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.delete('/api/documents/:docId', ...apiAuthStack, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { docId } = req.params;
    
    // Get document and verify ownership
    const [document] = await db.select().from(botDocuments).where(eq(botDocuments.id, docId));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Verify bot ownership
    if (document.botId) {
      const [bot] = await db.select().from(bots).where(eq(bots.id, document.botId));
      if (bot && bot.userId && bot.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this document' });
      }
    }

    const [deletedDocument] = await db.delete(botDocuments).where(eq(botDocuments.id, docId)).returning();
    res.json({ success: true, deleted: deletedDocument });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ========================================
// PHASE 1: MULTI-TENANT ARCHITECTURE ROUTES
// ========================================

// Organization management
app.use('/api/organizations', organizationsRouter);

// Audit logging
app.use('/api/audit', auditRouter);

// Analytics and insights
app.use('/api/analytics', analyticsRouter);

// Admin dashboard APIs
app.use('/api/admin', authenticate, authorize(['ADMIN', 'Admin', 'MasterAdmin']), adminRouter);

// Partner dashboard APIs
app.use('/api/partners', authenticate, authorize(['RESELLER', 'Admin', 'ADMIN', 'MasterAdmin']), partnersRouter);

// Client dashboard APIs (supports impersonation)
app.use('/api/clients', authenticate, applyImpersonation, loadOrganizationContext, tenantIsolation, clientsRouter);

// Impersonation sessions
app.use('/api/impersonation', authenticate, impersonationRouter);

// Bot template marketplace
app.use('/api/templates', authenticate, applyImpersonation, loadOrganizationContext, tenantIsolation, templatesRouter);

// Multi-channel deployment
app.use('/api/channels', channelsRouter);

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
});
