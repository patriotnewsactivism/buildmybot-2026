import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ========================================
// VALIDATION SCHEMAS
// ========================================

export const BotSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().max(100),
  systemPrompt: z.string().max(10000),
  model: z.string().max(100),
  temperature: z.number().min(0).max(2),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  maxMessages: z.number().int().min(1).max(10000),
  embedType: z.enum(['hover', 'fixed']),
});

export const LeadSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  score: z.number().int().min(0).max(100).optional(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Closed']),
});

export const UserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  companyName: z.string().max(255).optional(),
});

export const OrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

// ========================================
// VALIDATION MIDDLEWARE
// ========================================

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Query validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
