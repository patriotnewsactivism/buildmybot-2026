import { db } from '../db';
import { auditLogs, InsertAuditLog } from '../../shared/schema';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  async log(data: Omit<InsertAuditLog, 'id' | 'createdAt'>): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        id: uuidv4(),
        ...data,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async getLogsByOrganization(organizationId: string, limit: number = 100) {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getLogsByUser(userId: string, limit: number = 100) {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getLogsByResource(resourceType: string, resourceId: string, limit: number = 50) {
    return db
      .select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.resourceType, resourceType),
        eq(auditLogs.resourceId, resourceId)
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
