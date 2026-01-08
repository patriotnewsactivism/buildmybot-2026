import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// ========================================
// TENANT ISOLATION MIDDLEWARE
// ========================================

export function tenantIsolation() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for tenant isolation' });
      }

      if (!req.organization) {
        // User doesn't belong to an organization yet
        // This is okay for initial setup
        return next();
      }

      // Add organization context to all queries
      // This will be used by service layer to filter data
      req.query.organizationId = req.organization.id;

      next();
    } catch (error) {
      console.error('Tenant isolation error:', error);
      res.status(500).json({ error: 'Tenant isolation failed' });
    }
  };
}

// ========================================
// VERIFY RESOURCE OWNERSHIP
// ========================================

export function verifyResourceOwnership(resourceType: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // System admins can access all resources
      if (req.user.role === 'MasterAdmin' || req.user.role === 'Admin' || req.user.role === 'ADMIN') {
        return next();
      }

      // Check if resource belongs to user's organization
      const resourceId = req.params.id || req.params.botId || req.params.leadId;

      if (!resourceId) {
        return next();
      }

      // This check will be implemented in service layer
      // For now, just pass through
      next();
    } catch (error) {
      console.error('Resource ownership verification error:', error);
      res.status(500).json({ error: 'Resource ownership verification failed' });
    }
  };
}
