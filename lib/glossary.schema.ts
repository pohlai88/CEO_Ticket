import { z } from 'zod';

// Glossary field schema
const GlossaryFieldSchema = z.object({
  field_id: z.string(),
  field_name: z.string(),
  label: z.string(),
  meaning: z.string(),
  examples: z.array(z.string()),
  guidance: z.string(),
  anti_patterns: z.array(z.string()),
  required: z.boolean().default(false),
  depends_on: z.array(z.string()).optional(),
});

// Glossary concept schema
const GlossaryConceptSchema = z.object({
  concept_id: z.string(),
  concept_name: z.string(),
  description: z.string(),
  visual_explanation: z.string().optional(),
  rules: z.array(z.string()),
  key_terms: z.record(z.string()),
});

// Complete glossary
export const GlossarySchema = z.object({
  version: z.string().default('1.0'),
  last_updated: z.string(),
  scopes: z.object({
    onboarding: z.array(GlossaryFieldSchema),
    request_form: z.array(GlossaryFieldSchema),
    approval: z.array(GlossaryFieldSchema),
    admin_config: z.array(GlossaryFieldSchema),
  }),
  concepts: z.array(GlossaryConceptSchema),
});

export type GlossaryField = z.infer<typeof GlossaryFieldSchema>;
export type GlossaryConcept = z.infer<typeof GlossaryConceptSchema>;
export type Glossary = z.infer<typeof GlossarySchema>;
