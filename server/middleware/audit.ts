import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AuditService } from '../services/AuditService';

const auditService = new AuditService();

export function auditLog(action?: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next();
      }

      const auditAction = action || req.method.toLowerCase() + '.' + req.path.split('/')[2];
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const originalSend = res.send.bind(res);

      res.send = function (body: any): Response {
        auditService.log({
          userId: req.user.id,
          organizationId: req.organization?.id,
          action: auditAction,
          resourceType: req.params.id ? req.path.split('/')[2] : undefined,
          resourceId: req.params.id || req.params.botId || req.params.leadId,
          oldValues: req.method === 'PUT' || req.method === 'DELETE' ? req.body : undefined,
          newValues: req.method === 'POST' || req.method === 'PUT' ? body : undefined,
          ipAddress,
          userAgent,
        }).catch(err => console.error('Audit log error:', err));

        return originalSend(body);
      };

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      next();
    }
  };
}

export function auditSensitiveAction(actionName: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next();
      }

      await auditService.log({
        userId: req.user.id,
        organizationId: req.organization?.id,
        action: 'sensitive.' + actionName,
        resourceType: 'system',
        oldValues: { path: req.path, method: req.method },
        newValues: { query: req.query, params: req.params },
        ipAddress: req.ip || req.connection.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      next();
    } catch (error) {
      console.error('Sensitive action audit error:', error);
      next();
    }
  };
}
