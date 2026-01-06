import { z } from "zod";

/**
 * Glossary Schema
 *
 * The glossary is a DERIVED artifact, not authoritative.
 * Canonical truth flows: canonical.ts → API DTOs → Glossary
 *
 * @see docs/glossary.ui.json
 * @rcf-version 2.2.0
 */

// Meta header - declares derivation source
const GlossaryMetaSchema = z.object({
  derived_from: z.string().describe("Source of truth for this glossary"),
  rcf_version: z.string().describe("RCF version this glossary aligns with"),
  authoritative: z.literal(false).describe("Glossary is never authoritative"),
  last_validated: z.string().optional().describe("ISO date of last validation"),
});

// Glossary field schema with source binding
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
  // Source binding (optional, for fields with enum/type sources)
  source: z
    .string()
    .optional()
    .describe(
      "TypeScript type or enum name (e.g., RequestStatus, PriorityCode)"
    ),
  api_field: z.string().optional().describe("Corresponding API field name"),
  db_column: z
    .string()
    .optional()
    .describe("Corresponding database column name"),
});

// Glossary concept schema with source binding
const GlossaryConceptSchema = z.object({
  concept_id: z.string(),
  concept_name: z.string(),
  description: z.string(),
  visual_explanation: z.string().optional(),
  rules: z.array(z.string()),
  key_terms: z.record(z.string()),
  // Source binding
  source: z
    .string()
    .optional()
    .describe("Source type or constant (e.g., FSM_TRANSITIONS)"),
});

// Complete glossary with meta header
export const GlossarySchema = z.object({
  _meta: GlossaryMetaSchema,
  version: z.string().default("1.0"),
  last_updated: z.string(),
  scopes: z.object({
    onboarding: z.array(GlossaryFieldSchema),
    request_form: z.array(GlossaryFieldSchema),
    approval: z.array(GlossaryFieldSchema),
    admin_config: z.array(GlossaryFieldSchema),
  }),
  concepts: z.array(GlossaryConceptSchema),
});

export type GlossaryMeta = z.infer<typeof GlossaryMetaSchema>;
export type GlossaryField = z.infer<typeof GlossaryFieldSchema>;
export type GlossaryConcept = z.infer<typeof GlossaryConceptSchema>;
export type Glossary = z.infer<typeof GlossarySchema>;
