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
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `APP_BASE_URL` - Base URL for Stripe redirects
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

## Recent Changes
- 2026-01-08: Initial Replit setup and configuration
