import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services';
import {
  authenticate,
  loadOrganizationContext,
} from '../middleware';

const router = Router();
const analyticsService = new AnalyticsService();

// Apply authentication to all analytics routes
router.use(authenticate);
router.use(loadOrganizationContext);

// ========================================
// GET /api/analytics/metrics/:orgId
// Get conversion metrics for an organization
// ========================================
router.get('/metrics/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { startDate, endDate } = req.query;
    const user = (req as any).user;
    const organization = (req as any).organization;

    // Check access
    if (user.role !== 'MasterAdmin' && user.role !== 'Admin') {
      if (organization?.id !== orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const metrics = await analyticsService.getConversionMetrics(orgId, start, end);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// ========================================
// GET /api/analytics/performance/:orgId
// Get bot performance metrics for an organization
// ========================================
router.get('/performance/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { startDate, endDate } = req.query;
    const user = (req as any).user;
    const organization = (req as any).organization;

    // Check access
    if (user.role !== 'MasterAdmin' && user.role !== 'Admin') {
      if (organization?.id !== orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const performance = await analyticsService.getBotPerformance(orgId, start, end);
    res.json(performance);
  } catch (error) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// ========================================
// GET /api/analytics/timeseries/:orgId
// Get time series data for an organization
// ========================================
router.get('/timeseries/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const user = (req as any).user;
    const organization = (req as any).organization;

    // Check access
    if (user.role !== 'MasterAdmin' && user.role !== 'Admin') {
      if (organization?.id !== orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const data = await analyticsService.getTimeSeriesData(orgId, days);
    res.json(data);
  } catch (error) {
    console.error('Error fetching time series data:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

// ========================================
// GET /api/analytics/events/:orgId
// Get analytics events for an organization
// ========================================
router.get('/events/:orgId', async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { eventType, startDate, endDate, limit } = req.query;
    const user = (req as any).user;
    const organization = (req as any).organization;

    // Check access
    if (user.role !== 'MasterAdmin' && user.role !== 'Admin') {
      if (organization?.id !== orgId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const limitNum = limit ? parseInt(limit as string) : 100;

    let events;
    if (eventType) {
      events = await analyticsService.getEventsByType(orgId, eventType as string, limitNum);
    } else {
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      events = await analyticsService.getEventsByOrganization(orgId, start, end, limitNum);
    }

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ========================================
// GET /api/analytics/bot/:botId
// Get analytics events for a specific bot
// ========================================
router.get('/bot/:botId', async (req: Request, res: Response) => {
  try {
    const { botId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const events = await analyticsService.getEventsByBot(botId, limit);
    res.json(events);
  } catch (error) {
    console.error('Error fetching bot events:', error);
    res.status(500).json({ error: 'Failed to fetch bot events' });
  }
});

// ========================================
// POST /api/analytics/track
// Track a custom analytics event
// ========================================
router.post('/track', async (req: Request, res: Response) => {
  try {
    const eventData = req.body;
    const user = (req as any).user;
    const organization = (req as any).organization;

    const event = await analyticsService.trackEvent({
      organizationId: organization?.id,
      userId: user.id,
      ...eventData,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

export default router;
