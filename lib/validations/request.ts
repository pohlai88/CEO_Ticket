/**
 * Request Validation Schemas
 * Uses Zod for runtime validation
 */

import { z } from 'zod';

// Create request validation
export const createRequestSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),
  description: z.string()
    .max(10000, 'Description must not exceed 10,000 characters')
    .trim()
    .optional()
    .nullable(),
  priority_code: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']),
  category_id: z.string().uuid().optional().nullable(),
});

// Update request validation (same as create)
export const updateRequestSchema = createRequestSchema;

// Status transition validation
export const transitionStatusSchema = z.object({
  target_status: z.enum(['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'CLOSED']),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
