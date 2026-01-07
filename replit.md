# BuildMyBot

## Overview
BuildMyBot is a React + TypeScript web application for building and managing AI chatbots. It uses Vite as the build tool and includes various features like:
- Bot builder with multiple personas
- Chat logs and CRM
- Marketing tools
- Website builder
- Phone/Voice agent with Cartesia integration
- Admin dashboard
- Partner/Reseller functionality
- Hover widget and fixed embed chat types

## Project Structure
- `/components/` - React components organized by feature
- `/services/` - Frontend service integrations (API calls, OpenAI, Cartesia)
- `/server/` - Express API server for database operations
- `/shared/` - Shared schema and types (Drizzle ORM)
- `/public/` - Static assets including embed.js

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite 5
- **Backend**: Express.js API server
- **Database**: Replit PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS v4 (PostCSS)
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI**: OpenAI GPT-5o Mini (default, 33% cost reduction vs GPT-4o-mini)
- **Voice**: Cartesia (ultra-realistic voice synthesis)

## Development
- Run: `npm run dev` (starts both API server on 3001 and Vite on 5000)
- Build: `npm run build`
- Database push: `npm run db:push`

## Environment Variables
The application requires these environment variables/secrets:
- `DATABASE_URL` - Replit PostgreSQL connection string (auto-configured)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `CARTESIA_API_KEY` - Cartesia API key for voice agent

## Admin Roles
- **Master Admin**: mreardon@wtpnews.org
- **Admin**: jadj19@gmail.com

## API Endpoints
The Express server provides the following endpoints:
- `GET/POST/PUT /api/bots` - Bot CRUD operations
- `GET/POST /api/leads` - Lead management
- `GET/POST/PUT /api/users` - User profiles
- `GET/POST/PUT /api/conversations` - Chat conversations
- All endpoints support `?userId=` query parameter for filtering

## Deployment
Configured for autoscale deployment:
- Build: `npm run build` (compiles TypeScript and builds Vite frontend)
- Run: `npm run start` (runs Express server on port 5000, serves API + static frontend)
- In production, the Express server serves both the API and the built frontend from `dist/`

## Recent Changes
- 2026-01-04: Replit Auth Integration
  - Added Replit Auth using OpenID Connect (supports Google, GitHub, Apple, email)
  - Created sessions table for secure session storage
  - Auth routes: /api/login, /api/logout, /api/auth/user
  - Created useAuth hook (hooks/useAuth.ts) for React components
  - Created authUtils (services/authUtils.ts) for error handling
  - Auth storage integrates with existing users table
- 2026-01-04: Bot Builder & Voice Agent Improvements
  - Added embedType field to bots schema ('hover' or 'fixed')
  - New "Chatbot Display Type" section in Bot Builder config tab
  - Users can choose between Floating Bubble (hover widget) or Fixed Embed (always visible)
  - Completely overhauled Voice Agent setup:
    - Added tabbed interface: "Setup & API Key" and "Voice Configuration"
    - Quick Start Guide with 3 easy steps
    - API Key entry field with show/hide toggle and persistence
    - Delegated account info section for partner integrations
    - API key and delegation link now saved to user profile
    - Removed insecure fallback to environment variable
  - About page updated with leadership team:
    - Matthew Reardon - Founder, President & CEO
    - Joey Davenport - Vice President of Artificial Intelligence
    - Benjamin Campagna - Chief Legal Officer & General Counsel
  - Blog author updated to Matthew Reardon across all pages
  - Removed fake testimonials from landing page
- 2026-01-04: Referral Rewards System
  - Added referral credits tracking to users table (referralCredits, referralCreditsExpiry)
  - When a referred user subscribes to a paid plan, the referrer earns credits equal to one month of that plan's price
  - Credits are valid for 12 months and can be applied to subscription payments
  - Added REFERRAL_REWARDS constant with reward configuration
  - New API endpoints:
    - `GET /api/users/:id/credits` - Fetch user's referral credits
    - `POST /api/referral/credit` - Credit referrer when referral subscribes
    - `POST /api/users/:id/apply-credits` - Apply credits to subscription
  - ResellerDashboard now displays available referral credits with expiry date
  - Credits appear as a golden card in the Partner dashboard overview
- 2026-01-04: Whitelabel Partner Option
  - Added $499 one-time Whitelabel option for instant 50% commission
  - Partners can skip the tiered structure (Bronze/Silver/Gold/Platinum) entirely
  - WHITELABEL_FEE constant added to constants.ts
  - Partner Program page shows both growth path and Whitelabel side-by-side
- 2026-01-02: New pages and document upload feature
  - Created footer pages with populated content:
    - /about - Company story, mission, team section with 6 team members
    - /blog - Blog page with 6 sample articles and category filtering
    - /careers - Careers page with company culture, 6 perks, and 3 job openings
    - /contact - Contact form with company info and social links
    - /privacy - Full privacy policy with 14 sections
  - Created detailed Features page (/features):
    - Fancy design with gradient backgrounds and glassmorphism effects
    - 8 core feature cards with detailed descriptions
    - Interactive demo section with simulated chat
    - Comparison table (BuildMyBot vs Intercom, Drift, Zendesk)
    - Integration logos (OpenAI, Stripe, Slack, etc.)
    - FAQ accordion section
  - Added document upload for chatbot knowledge base:
    - New botDocuments table in database
    - Drag-and-drop upload UI in BotBuilder
    - Supports PDF, DOCX, TXT files (max 10MB)
    - Upload/list/delete documents with progress tracking
    - Authentication required for all document endpoints
- 2026-01-02: Critical bug fixes and responsive design improvements
  - Fixed bot creation: Bots now properly save to database (was using PUT instead of POST)
  - Fixed share/embed links: BotBuilder now syncs with server-generated UUIDs after save
  - Added "Save bot first" warning before copying embed code or share links
  - Fixed embed.js to auto-detect domain (works in development and production)
  - Comprehensive responsive design fixes:
    - Added overflow-x-hidden to prevent horizontal scroll
    - Made dashboard grids responsive (stack on mobile)
    - Made hover widgets and chat embeds responsive
    - Fixed tab navigation with horizontal scroll on small screens
    - Made form inputs stack vertically on mobile
    - Improved sidebar mobile behavior
  - Added YouTube intro video to landing page
- 2026-01-02: Major admin dashboard enhancements
  - Added Voice Setup tab with Cartesia integration instructions
  - Added Admin Invites tab for sending admin/partner invitations
  - Voice Agent pricing tiers: Starter ($49), Professional ($149), Enterprise ($399)
  - Pricing designed for 50% partner commission margin
  - Partner approval workflow: applications now require admin approval before access
    - New partners get OWNER role (not RESELLER) with 'Pending' status
    - Sidebar hides Partner/Reseller menu for pending partners
    - ResellerDashboard shows pending approval message
  - Fixed referral link URL generation (now includes https:// protocol)
  - jadj19@gmail.com now set as admin (second in command)
  - Fixed bot list z-index to prevent overlap with main menu
  - Improved dbService with separate createUser/saveUserProfile methods
- 2026-01-02: Partner/Reseller Program enhancements and integrity cleanup
  - Renamed sidebar "Partner Portal" to "Partner/Reseller"
  - Added prominent partner program teaser on homepage with commission tier breakdown
  - Removed fabricated statistics from testimonials (no more specific dollar amounts or percentages)
  - Made testimonials experience-based and believable
  - Added Marketing Materials tab to ResellerDashboard with sales collateral
  - Includes sales deck, email templates, ROI calculator, graphics pack, case study templates, brand guide
  - Added copy-to-clipboard email templates for cold outreach
- 2026-01-02: Stripe billing integration
  - Connected Stripe via Replit integration
  - Created Stripe client, webhook handlers, and service layer
  - Added stripe_customer_id and stripe_subscription_id to users table
  - Seeded products: Starter ($29), Professional ($99), Executive ($199), Ultimate Power ($499)
  - Updated Billing component to use real Stripe Checkout
  - Added customer portal for subscription management
  - Webhooks automatically sync Stripe data to database
- 2026-01-02: Pre-launch polish and branding updates
  - Added favicon and logo images
  - Redesigned landing page hero section with better typography and spacing
  - Improved navbar with logo and cleaner design
  - Enhanced dashboard mockup section with glassmorphism effects
  - Polished testimonials section with gradient avatars
  - Added trust indicators (no credit card, 5-min setup, cancel anytime)
  - Fixed Cartesia voice ID and added actual audio playback
  - Removed all Batesville City references
- 2026-01-02: Fixed all app errors and improved stability
  - Installed Tailwind CSS v4 properly (replaced CDN with PostCSS)
  - Improved OpenAI error handling with user-friendly messages for quota/key issues
  - Verified all database operations (bots, users, leads, conversations)
  - Shortened boot animation for better UX
- 2026-01-02: Removed Supabase dependencies
  - Deleted supabaseClient.ts and supabase directory
  - Updated App.tsx and AuthModal.tsx to use manual auth flow only
  - Removed @supabase/supabase-js from package.json
  - Cleaned up vite.config.ts and vite-env.d.ts
- 2026-01-02: Migrated database from Supabase to Replit PostgreSQL
  - Created Drizzle ORM schema (users, bots, leads, conversations tables)
  - Added Express API server with full CRUD endpoints
  - Updated frontend dbService to use API endpoints
  - Added userId-based filtering for data scoping
- 2026-01-02: Fixed environment variable loading
  - Updated vite.config.ts to properly expose all API keys to frontend
  - Fixed OpenAI key mapping (OPENAI_API_KEY -> VITE_OPENAI_API_KEY)
  - Fixed Cartesia API key exposure for voice agent
- 2026-01-02: Added voice agent with Cartesia integration
  - Ultra-realistic voice preview on landing page
  - Hover widget and fixed embed chat types
- 2026-01-02: Initial Replit setup
  - Configured Vite to use port 5000 with host 0.0.0.0
  - Enabled allowedHosts for Replit proxy compatibility
