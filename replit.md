# BuildMyBot

## Overview
BuildMyBot is an AI-powered chatbot builder platform that helps businesses automate lead generation and customer support. The application features a React frontend with an Express backend, using PostgreSQL for data persistence.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe integration
- **Build Tool**: Vite

### Directory Structure
```
├── components/       # React UI components
├── hooks/           # React custom hooks
├── public/          # Static assets
├── server/          # Express backend
│   ├── middleware/  # Express middleware
│   ├── migrations/  # Database migrations
│   ├── routes/      # API routes
│   ├── seeds/       # Seed data scripts
│   ├── services/    # Business logic services
│   ├── types/       # TypeScript types
│   ├── db.ts        # Database connection
│   └── index.ts     # Server entry point
├── services/        # Frontend services
├── shared/          # Shared types and schema
│   └── schema.ts    # Drizzle database schema
├── src/             # Frontend source
├── App.tsx          # Main React app component
├── index.tsx        # Frontend entry point
└── vite.config.ts   # Vite configuration
```

### Key Configuration
- Frontend runs on port 5000 (0.0.0.0)
- Backend API runs on port 3001 (development) or 5000 (production)
- Vite proxies `/api` requests to backend in development
- `allowedHosts: true` configured for Replit proxy compatibility

### Database
- PostgreSQL database with Drizzle ORM
- Schema defined in `shared/schema.ts`
- Push schema changes: `npm run db:push`
- View database: `npm run db:studio`

### Running the Application
- Development: `npm run dev` (runs both frontend and backend concurrently)
- Production: `npm run build` then `npm run start`

### Environment Variables
- `SUPABASE_DATABASE_URL` - Supabase PostgreSQL connection string (primary database)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase publishable/anon key
- `DATABASE_URL` - Fallback PostgreSQL connection string (auto-provided by Replit)
- `APP_BASE_URL` - Base URL for Stripe redirects
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `OPENAI_API_KEY` - OpenAI API key for AI features and OCR
- `CARTESIA_API_KEY` - Cartesia API key for voice agents

## Knowledge Base System

### Architecture
The knowledge base system enables clients to build custom knowledge repositories that power both chatbot and voice agent responses through RAG (Retrieval Augmented Generation).

### Key Components
- **WebScraperService** (`server/services/WebScraperService.ts`): Website crawling and content extraction with rate limiting
- **DocumentProcessorService** (`server/services/DocumentProcessorService.ts`): PDF/DOCX extraction using pdf-parse and mammoth, OCR via OpenAI Vision
- **KnowledgeService** (`server/services/KnowledgeService.ts`): Search and context building for RAG responses
- **Knowledge API** (`server/routes/knowledge.ts`): REST endpoints for scraping, upload, search

### Database Tables
- `knowledge_sources`: Tracks URL and document sources per bot
- `knowledge_chunks`: Stores chunked content with metadata for retrieval

### Features
- Website crawling with configurable depth (1-10 pages)
- Document upload with automatic text extraction (PDF, DOCX, TXT, MD)
- OCR for images and scanned PDFs using OpenAI Vision
- Content chunking and indexing for efficient retrieval
- Relevance-based search with stopword filtering
- Per-client knowledge isolation through tenant/organization context

## Revenue Model Implementation

### Billing Schema (`shared/billing-schema.ts`)
Comprehensive billing foundation with 20+ tables:
- **Plans & Subscriptions**: Tiered plans (Free, Starter, Professional, Enterprise) with Stripe integration
- **Entitlements**: Feature-based access control with usage limits
- **Usage Pools**: SMS, email, and storage credits with consumption tracking
- **Voice Minutes**: Prepaid packages with auto-depletion
- **API Keys**: Rate-limited developer access
- **Services**: One-time professional services catalog
- **Templates**: Premium marketplace with purchase history

### Backend Services
- **BillingService** (`server/services/BillingService.ts`): Plan management, subscriptions, entitlements
- **WhitelabelService** (`server/services/WhitelabelService.ts`): Custom branding, domains, logos
- **ApiKeyService** (`server/services/ApiKeyService.ts`): API key lifecycle, rate limiting

### Revenue API (`server/routes/revenue.ts`)
30+ endpoints organized under `/api/revenue`:
- `/plans`, `/subscriptions`, `/entitlements`
- `/voice-minutes`, `/usage-pools`, `/credits`
- `/whitelabel`, `/api-keys`, `/services`

### Revenue UI Components
- **AdvancedAnalytics** (`components/Analytics/`): Detailed metrics and reporting
- **LandingPageBuilder** (`components/LandingPages/`): Lead capture page creation
- **ServiceCatalog** (`components/Services/`): Professional services ordering
- **SupportTicketSystem** (`components/Support/`): Priority SLA-based support
- **TemplateMarketplace** (`components/Marketplace/`): Premium template purchases
- **VoiceMinutes** (`components/Billing/`): Voice package management
- **UsageCredits** (`components/Billing/`): SMS/email/storage tracking
- **WhiteLabelSettings** (`components/Settings/`): Custom branding configuration
- **ApiKeyManager** (`components/Settings/`): Developer API access

### Navigation Updates
Sidebar includes: Analytics, Landing Pages, Pro Services, Support, and enhanced Billing & Usage

## Recent Changes
- 2026-01-08: Complete revenue model with recurring subscriptions, one-time services, usage-based billing
- 2026-01-08: Added 9 revenue-generating UI components with premium styling
- 2026-01-08: Integrated all features into navigation with controlled component pattern
- 2026-01-08: Implemented comprehensive knowledge base with website scraping, document OCR, and RAG integration
- 2026-01-08: Initial Replit setup and configuration
