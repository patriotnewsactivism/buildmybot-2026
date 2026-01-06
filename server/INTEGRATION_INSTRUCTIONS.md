# Server Integration Instructions

This file contains the exact code changes needed to integrate Phase 1 into `server/index.ts`.

---

## Step 1: Add Imports

Add these import statements at the top of `server/index.ts`, after the existing imports:

```typescript
// Phase 1: Multi-tenant architecture imports
import { securityHeaders, apiLimiter } from './middleware';
import { organizationsRouter, auditRouter, analyticsRouter } from './routes';
```

**Location:** After line 16 (after `import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';`)

---

## Step 2: Add Security Middleware

Add these middleware configurations after `app.use(express.json());`:

```typescript
// Phase 1: Apply security headers
app.use(securityHeaders);

// Phase 1: Apply rate limiting to API routes
app.use('/api', apiLimiter);
```

**Location:** After line 138 (`app.use(express.json());`)

---

## Step 3: Register New API Routes

Add these route registrations after the existing API routes and before the static file serving:

```typescript
// ========================================
// PHASE 1: MULTI-TENANT ARCHITECTURE ROUTES
// ========================================

// Organization management
app.use('/api/organizations', organizationsRouter);

// Audit logging
app.use('/api/audit', auditRouter);

// Analytics and insights
app.use('/api/analytics', analyticsRouter);
```

**Location:** Add this section after all existing `/api/*` routes but before the static file serving (around line 750, before `app.get('*', ...)`)

---

## Complete Example

Here's how the relevant sections should look after integration:

### Imports Section (Lines 1-20)
```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { runMigrations } from 'stripe-replit-sync';
import { db } from './db';
import { users, bots, leads, conversations, botDocuments } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getStripeSync, getStripePublishableKey } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { stripeService } from './stripeService';
import { PLANS, RESELLER_TIERS, WHITELABEL_FEE } from '../constants';
import multer from 'multer';
import { setupAuth, registerAuthRoutes } from './replit_integrations/auth';

// Phase 1: Multi-tenant architecture imports
import { securityHeaders, apiLimiter } from './middleware';
import { organizationsRouter, auditRouter, analyticsRouter } from './routes';
```

### Middleware Section (After line 138)
```typescript
app.use(express.json());

// Phase 1: Apply security headers
app.use(securityHeaders);

// Phase 1: Apply rate limiting to API routes
app.use('/api', apiLimiter);
```

### Routes Section (Before static file serving)
```typescript
// ... existing routes ...

// ========================================
// PHASE 1: MULTI-TENANT ARCHITECTURE ROUTES
// ========================================

// Organization management
app.use('/api/organizations', organizationsRouter);

// Audit logging
app.use('/api/audit', auditRouter);

// Analytics and insights
app.use('/api/analytics', analyticsRouter);

// ... static file serving ...
```

---

## Verification

After making these changes, verify the integration:

### 1. TypeScript Compilation
```bash
npm run build
```

Should complete without errors.

### 2. Check Imports
```bash
# Run this to check for import errors
tsx --check server/index.ts
```

### 3. Start Server (Test Mode)
```bash
npm run server
```

Look for:
- ✅ No import errors
- ✅ Server starts successfully
- ✅ Routes registered message in logs

### 4. Test Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Test security headers
curl -I http://localhost:3001/api/health | grep -i "x-frame-options"

# Test rate limiting (make 110 requests)
for i in {1..110}; do curl http://localhost:3001/api/health; done
# Should see rate limit error after 100 requests
```

---

## Troubleshooting

### Import Error: Cannot find module './middleware'

**Cause:** Middleware files not found

**Solution:**
```bash
# Verify middleware files exist
ls -la server/middleware/

# Should see:
# - index.ts
# - auth.ts
# - validation.ts
# - audit.ts
# - tenant.ts
# - security.ts
```

### Import Error: Cannot find module './routes'

**Cause:** Route files not found

**Solution:**
```bash
# Verify route files exist
ls -la server/routes/

# Should see:
# - index.ts
# - organizations.ts
# - audit.ts
# - analytics.ts
```

### Error: securityHeaders is not a function

**Cause:** Incorrect import or export in middleware files

**Solution:**
Check that `server/middleware/security.ts` exports `securityHeaders` correctly:
```typescript
export const securityHeaders = helmet({...});
```

### Error: apiLimiter is not a function

**Cause:** Incorrect import or export in middleware files

**Solution:**
Check that `server/middleware/security.ts` exports `apiLimiter` correctly:
```typescript
export const apiLimiter = rateLimit({...});
```

### Server starts but routes don't work

**Cause:** Routes registered in wrong order or middleware blocking requests

**Solution:**
1. Ensure new routes are registered BEFORE static file serving
2. Check middleware order - security headers and rate limiting should come AFTER express.json()
3. Verify authentication middleware is not applied globally

---

## Alternative: Copy-Paste Integration

If you prefer, here's a complete diff-style view of what to change:

### At line ~16 (after imports), ADD:
```diff
+ // Phase 1: Multi-tenant architecture imports
+ import { securityHeaders, apiLimiter } from './middleware';
+ import { organizationsRouter, auditRouter, analyticsRouter } from './routes';
```

### At line ~138 (after app.use(express.json())), ADD:
```diff
  app.use(express.json());
+
+ // Phase 1: Apply security headers
+ app.use(securityHeaders);
+
+ // Phase 1: Apply rate limiting to API routes
+ app.use('/api', apiLimiter);
```

### At line ~745 (before static files), ADD:
```diff
+ // ========================================
+ // PHASE 1: MULTI-TENANT ARCHITECTURE ROUTES
+ // ========================================
+
+ // Organization management
+ app.use('/api/organizations', organizationsRouter);
+
+ // Audit logging
+ app.use('/api/audit', auditRouter);
+
+ // Analytics and insights
+ app.use('/api/analytics', analyticsRouter);
+
  // Serve static files
  if (isProduction) {
    ...
  }
```

---

## Post-Integration Checklist

After making these changes:

- [ ] Code compiles without TypeScript errors
- [ ] Server starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] Security headers present in responses
- [ ] Rate limiting works (tested with curl loop)
- [ ] New API endpoints respond (with 401 if not authenticated)
- [ ] Existing functionality still works
- [ ] No console errors in browser
- [ ] Database migrations completed

---

**Integration Instructions Prepared By:** Builder Agent
**Last Updated:** January 6, 2026
