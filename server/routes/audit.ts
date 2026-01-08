import { Router, Request, Response } from 'express';
import { AuditService } from '../services';
import {
  authenticate,
  authorize,
  loadOrganizationContext,
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
<<<<<<< HEAD
router.get('/organization/:orgId', authorize(['MasterAdmin', 'Admin', 'Partner']), async (req: Request, res: Response) => {
=======
router.get('/organization/:orgId', authorize(['MasterAdmin', 'Admin', 'ADMIN', 'Partner']), async (req: AuthRequest, res) => {
>>>>>>> ef495d458b1000d2c3126b1a5b0a1675f906fe27
  try {
    const { orgId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const user = (req as any).user;
    const organization = (req as any).organization;

    // Check if user has access to this organization
<<<<<<< HEAD
    if (user.role !== 'MasterAdmin' && user.role !== 'Admin') {
      if (organization?.id !== orgId) {
=======
    if (req.user.role !== 'MasterAdmin' && req.user.role !== 'Admin' && req.user.role !== 'ADMIN') {
      if (req.organization?.id !== orgId) {
>>>>>>> ef495d458b1000d2c3126b1a5b0a1675f906fe27
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
<<<<<<< HEAD
router.get('/user/:userId', authorize(['MasterAdmin', 'Admin']), async (req: Request, res: Response) => {
=======
router.get('/user/:userId', authorize(['MasterAdmin', 'Admin', 'ADMIN']), async (req: AuthRequest, res) => {
>>>>>>> ef495d458b1000d2c3126b1a5b0a1675f906fe27
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
router.get('/resource/:resourceType/:resourceId', async (req: Request, res: Response) => {
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
