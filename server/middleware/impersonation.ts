import { Response, NextFunction } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db';
import { impersonationSessions, users } from '../../shared/schema';
import type { AuthRequest } from './auth';

export async function applyImpersonation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers['x-impersonation-token'];
    if (!token) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [session] = await db
      .select()
      .from(impersonationSessions)
      .where(eq(impersonationSessions.id, token as string));

    if (!session || session.revokedAt) {
      return res.status(401).json({ error: 'Impersonation session expired' });
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ error: 'Impersonation session expired' });
    }

    if (session.actorUserId !== req.user.id) {
      return res.status(403).json({ error: 'Impersonation session not authorized' });
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.targetUserId), isNull(users.deletedAt)));

    if (!targetUser) {
      return res.status(404).json({ error: 'Impersonation target not found' });
    }

    req.actor = req.user;
    req.user = targetUser;
    req.impersonation = {
      sessionId: session.id,
      targetUserId: session.targetUserId,
      actorUserId: session.actorUserId,
    };

    next();
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to apply impersonation session' });
  }
}
