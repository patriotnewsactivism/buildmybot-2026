/**
 * API Routes Index
 * Centralized export point for all API routes
 */

import organizationsRouter from './organizations';
import auditRouter from './audit';
import analyticsRouter from './analytics';
import adminRouter from './admin';
import partnersRouter from './partners';
import clientsRouter from './clients';
import impersonationRouter from './impersonation';
import templatesRouter from './templates';
import channelsRouter from './channels';
import knowledgeRouter from './knowledge';

export {
  organizationsRouter,
  auditRouter,
  analyticsRouter,
  adminRouter,
  partnersRouter,
  clientsRouter,
  impersonationRouter,
  templatesRouter,
  channelsRouter,
  knowledgeRouter,
};
