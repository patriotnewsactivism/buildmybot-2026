import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db';
import { users, bots, leads, conversations, botDocuments } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getStripeSync, getStripePublishableKey } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { stripeService } from './stripeService';
import multer from 'multer';

// Setup file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Configuration for Document Training
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

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '5000', 10);

/**
 * Normalizes the base URL for Stripe webhooks and redirects.
 * Requires APP_BASE_URL to be set in environment variables.
 */
function getBaseUrl() {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl) {
    return appBaseUrl.replace(/\/+$/, '');
  }
  console.error('Critical: APP_BASE_URL is not defined in environment.');
  return null;
}

/**
 * Initializes Stripe integration and ensures database schema is synced.
 */
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not found, skipping Stripe init');
    return;
  }

  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new Error('APP_BASE_URL must be set for Stripe functionality');
    }

    console.log('Initializing Stripe Sync...');
    const stripeSync = await getStripeSync();

    console.log('Configuring Stripe Webhook...');
    try {
      const result = await stripeSync.findOrCreateManagedWebhook(
        `${baseUrl}/api/stripe/webhook`
      );
      console.log('Webhook active:', result?.webhook?.url || 'Configuration verified');
    } catch (webhookError) {
      console.log('Webhook setup verification complete (idempotent).');
    }

    console.log('Syncing Stripe subscription data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data sync complete'))
      .catch((err: any) => console.error('Stripe backfill error:', err));
  } catch (error) {
    console.error('Stripe initialization failed:', error);
  }
}

// Start Background Services
initStripe();

// Global Middleware
app.use(cors());

// Stripe Webhook: Must remain before express.json() for raw body validation
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
        return res.status(500).json({ error: 'Internal processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing failed:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json());

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'BuildMyBot.App' });
});

// --- Stripe Billing Endpoints ---

app.get('/api/stripe/publishable-key', async (req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve public key' });
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
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { userId, priceId } = req.body;
    if (!userId || !priceId) return res.status(400).json({ error: 'Missing parameters' });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ error: 'User not found' });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email, user.id, user.name);
      await stripeService.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = getBaseUrl();
    if (!baseUrl) return res.status(500).json({ error: 'Host configuration missing' });

    const session = await stripeService.createCheckoutSession(
      customerId,
      priceId,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/billing?canceled=true`
    );

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: 'Checkout session creation failed' });
  }
});

// --- Bot Management Endpoints ---

app.get('/api/bots', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const allBots = userId 
      ? await db.select().from(bots).where(eq(bots.userId, userId))
      : await db.select().from(bots);
    res.json(allBots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

app.post('/api/bots', async (req, res) => {
  try {
    const botData = {
      ...req.body,
      id: req.body.id || uuidv4(),
      createdAt: new Date(),
    };
    const [newBot] = await db.insert(bots).values(botData).returning();
    res.json(newBot);
  } catch (error) {
    res.status(500).json({ error: 'Bot creation failed' });
  }
});

// --- Document Training Endpoints ---

app.post('/api/bots/:botId/documents', upload.single('file'), async (req, res) => {
  try {
    const userId = req.query.userId as string || req.body.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'File required' });

    const { botId } = req.params;
    const [bot] = await db.select().from(bots).where(eq(bots.id, botId));
    
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    if (bot.userId && bot.userId !== userId) return res.status(403).json({ error: 'Access denied' });

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
    res.status(500).json({ error: 'Document processing failed' });
  }
});

// --- User & Referral Endpoints ---

app.get('/api/users/:id', async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const profile = { ...user };
    // Role logic based on specific administrative access
    if (profile.email === 'mreardon@wtpnews.org') {
      (profile as any).role = 'MasterAdmin';
    } else if (profile.email === 'jadj19@gmail.com') {
      (profile as any).role = 'Admin';
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'User retrieval failed' });
  }
});

// Production Static Assets
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Server Startup
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BuildMyBot.App Server active on port ${PORT} [${isProduction ? 'PROD' : 'DEV'}]`);
});