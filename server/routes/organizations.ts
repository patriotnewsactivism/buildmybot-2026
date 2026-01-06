import { Router } from 'express';
import { OrganizationService } from '../services';
import {
  authenticate,
  authorize,
  loadOrganizationContext,
  validateRequest,
  OrganizationSchema,
  auditSensitiveAction,
  AuthRequest,
} from '../middleware';
import { z } from 'zod';

const router = Router();
const orgService = new OrganizationService();

// Apply authentication to all organization routes
router.use(authenticate);
router.use(loadOrganizationContext);

// ========================================
// GET /api/organizations/:id
// Get organization details
// ========================================
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const org = await orgService.getOrganization(id);

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user has access to this organization
    if (req.user.role !== 'MasterAdmin' && req.user.role !== 'Admin') {
      if (req.organization?.id !== id) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
    }

    res.json(org);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// ========================================
// POST /api/organizations
// Create a new organization
// ========================================
router.post(
  '/',
  validateRequest(OrganizationSchema),
  auditSensitiveAction('create_organization'),
  async (req: AuthRequest, res) => {
    try {
      const orgData = req.body;

      const newOrg = await orgService.createOrganization(
        orgData,
        req.user.id
      );

      res.status(201).json(newOrg);
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

// ========================================
// GET /api/organizations/slug/:slug
// Get organization by slug
// ========================================
router.get('/slug/:slug', async (req: AuthRequest, res) => {
  try {
    const { slug } = req.params;

    const org = await orgService.getOrganizationBySlug(slug);

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(org);
  } catch (error) {
    console.error('Error fetching organization by slug:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// ========================================
// GET /api/organizations/:id/members
// Get organization members
// ========================================
router.get('/:id/members', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check access
    if (req.user.role !== 'MasterAdmin' && req.user.role !== 'Admin') {
      if (req.organization?.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const members = await orgService.getMembers(id);
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ========================================
// POST /api/organizations/:id/members
// Add a member to organization
// ========================================
const addMemberSchema = z.object({
  userId: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
});

router.post(
  '/:id/members',
  validateRequest(addMemberSchema),
  auditSensitiveAction('add_organization_member'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { userId, role, permissions } = req.body;

      // Check if user is owner or admin of the organization
      if (req.organization?.id !== id || req.user.role === 'CLIENT') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const member = await orgService.addMember(
        id,
        userId,
        role,
        permissions,
        req.user.id
      );

      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding member:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
);

// ========================================
// DELETE /api/organizations/:id/members/:userId
// Remove a member from organization
// ========================================
router.delete(
  '/:id/members/:userId',
  auditSensitiveAction('remove_organization_member'),
  async (req: AuthRequest, res) => {
    try {
      const { id, userId } = req.params;

      // Check permissions
      if (req.organization?.id !== id || req.user.role === 'CLIENT') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await orgService.removeMember(id, userId, req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
);

// ========================================
// PUT /api/organizations/:id/members/:userId
// Update member role and permissions
// ========================================
const updateMemberSchema = z.object({
  role: z.string(),
  permissions: z.array(z.string()),
});

router.put(
  '/:id/members/:userId',
  validateRequest(updateMemberSchema),
  auditSensitiveAction('update_organization_member'),
  async (req: AuthRequest, res) => {
    try {
      const { id, userId } = req.params;
      const { role, permissions } = req.body;

      // Check permissions
      if (req.organization?.id !== id || req.user.role === 'CLIENT') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updated = await orgService.updateMemberRole(
        id,
        userId,
        role,
        permissions,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      console.error('Error updating member:', error);
      res.status(500).json({ error: 'Failed to update member' });
    }
  }
);

export default router;
