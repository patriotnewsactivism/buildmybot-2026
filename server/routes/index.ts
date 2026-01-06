/**
 * API Routes Index
 * Centralized export point for all API routes
 */

import organizationsRouter from './organizations';
import auditRouter from './audit';
import analyticsRouter from './analytics';

export {
  organizationsRouter,
  auditRouter,
  analyticsRouter,
};
