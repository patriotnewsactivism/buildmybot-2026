import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { systemMetricsService } from '../services/SystemMetricsService';

export function metricsMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    systemMetricsService.recordRequest({
      timestamp: Date.now(),
      status: res.statusCode,
      durationMs: Date.now() - start,
      userId: req.user?.id ?? req.actor?.id,
    });
  });

  next();
}
