import { Router } from 'express';
import { AuditService } from '../services';
import {
  authenticate,
  authorize,
  loadOrganizationContext,
  AuthRequest,
} from '../middleware';

const router = Router();
const auditService = new AuditService();

// Apply authentication to all audit routes
router.use(authenticate);
router.use(loadOrganizationContext);

// ========================================
// GET /api/audit/organization/:orgId
// Get audit logs for an organization
// ========================================
router.get('/organization/:orgId', authorize(['MasterAdmin', 'Admin', 'Partner']), async (req: AuthRequest, res) => {
  try {
    const { orgId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    // Check if user has access to this organization
    if (req.user.role !== 'MasterAdmin' && req.user.role !== 'Admin') {
      if (req.organization?.id !== orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const logs = await auditService.getLogsByOrganization(orgId, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ========================================
// GET /api/audit/user/:userId
// Get audit logs for a specific user
// ========================================
router.get('/user/:userId', authorize(['MasterAdmin', 'Admin']), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await auditService.getLogsByUser(userId, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ========================================
// GET /api/audit/resource/:resourceType/:resourceId
// Get audit logs for a specific resource
// ========================================
router.get('/resource/:resourceType/:resourceId', async (req: AuthRequest, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await auditService.getLogsByResource(resourceType, resourceId, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching resource audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
