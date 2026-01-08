import { Request, Response, NextFunction, RequestHandler } from 'express';
import { db } from '../db';
import { users, organizationMembers, organizations } from '../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

// ========================================
// EXTENDED REQUEST INTERFACE
// ========================================

export interface AuthRequest extends Request {
  user?: any;
  actor?: any;
  impersonation?: {
    sessionId: string;
    targetUserId: string;
    actorUserId: string;
  };
  organization?: any;
  permissions?: string[];
  session?: any;
}

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user from session or headers
    const headerUserId = req.headers['x-user-id'];
    const sessionUserId = (req as any).user?.claims?.sub;
    const userId = sessionUserId || (req as any).session?.userId || headerUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId as string),
        isNull(users.deletedAt)
      ));

    if (!user) {
      return res.status(401).json({ error: 'Invalid user or user has been deleted' });
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    (req as any).user = user;
    (req as any).actor = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// ========================================
// AUTHORIZATION MIDDLEWARE
// ========================================

export function authorize(allowedRoles: string[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const actor = (req as any).actor || (req as any).user;
    if (!actor) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has one of the allowed roles
    if (allowedRoles.includes(actor.role) || ((req as any).user && allowedRoles.includes((req as any).user.role))) {
      return next();
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

// ========================================
// ORGANIZATION CONTEXT MIDDLEWARE
// ========================================

export const loadOrganizationContext: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Load user's primary organization
    if (user.organizationId) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(and(
          eq(organizations.id, user.organizationId),
          isNull(organizations.deletedAt)
        ));

      if (org) {
        (req as any).organization = org;
      }
    }

    // Load organization membership and permissions
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id));

    if (membership) {
      (req as any).permissions = membership.permissions as string[] || [];
    }

    next();
  } catch (error) {
    console.error('Organization context error:', error);
    res.status(500).json({ error: 'Failed to load organization context' });
  }
};

// ========================================
// PERMISSION CHECK MIDDLEWARE
// ========================================

export function requirePermission(permission: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const actor = (req as any).actor || (req as any).user;
    if (!actor) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // System admins bypass permission checks
    if (actor.role === 'MasterAdmin' || actor.role === 'Admin' || actor.role === 'ADMIN') {
      return next();
    }

    // Check if user has the required permission
    const permissions = (req as any).permissions;
    if (permissions && permissions.includes(permission)) {
      return next();
    }

    res.status(403).json({ error: `Permission denied: ${permission}` });
  };
}
