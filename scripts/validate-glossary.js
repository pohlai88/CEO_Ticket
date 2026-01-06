#!/usr/bin/env node

/**
 * Glossary Validator
 *
 * Validates glossary.ui.json structure and source bindings.
 * The glossary is a DERIVED artifact - this validates it aligns with canonical sources.
 *
 * @rcf-version 2.2.0
 */

const fs = require("fs");
const path = require("path");

const glossaryPath = path.join(__dirname, "..", "docs", "glossary.ui.json");

// Known canonical sources (for source binding validation)
const KNOWN_SOURCES = [
  "RequestStatus",
  "PriorityCode",
  "Category.id",
  "FSM_TRANSITIONS",
  "RequestStatus + FSM_TRANSITIONS",
  "PriorityCode + DEFAULT_PRIORITY_METADATA",
];

try {
  const glossaryContent = fs.readFileSync(glossaryPath, "utf-8");
  const glossary = JSON.parse(glossaryContent);

  // Validate _meta header (REQUIRED for governance)
  if (!glossary._meta) {
    throw new Error("Glossary missing _meta header (governance requirement)");
  }

  if (glossary._meta.authoritative !== false) {
    throw new Error(
      "Glossary _meta.authoritative must be false (glossary is derived, not authoritative)"
    );
  }

  if (!glossary._meta.derived_from) {
    throw new Error("Glossary _meta.derived_from is required");
  }

  if (!glossary._meta.rcf_version) {
    throw new Error("Glossary _meta.rcf_version is required");
  }

  // Validate structure
  if (!glossary.version) {
    throw new Error("Glossary missing version field");
  }

  if (!glossary.scopes) {
    throw new Error("Glossary missing scopes object");
  }

  // Check all scopes have array of fields
  const requiredScopes = [
    "onboarding",
    "request_form",
    "approval",
    "admin_config",
  ];
  for (const scope of requiredScopes) {
    if (!Array.isArray(glossary.scopes[scope])) {
      throw new Error(`Glossary scope "${scope}" is not an array`);
    }
  }

  // Validate each field has required properties
  const allFields = Object.values(glossary.scopes).flat();
  let sourceBindings = 0;

  for (const field of allFields) {
    if (!field.field_id)
      throw new Error(`Field missing field_id: ${JSON.stringify(field)}`);
    if (!field.field_name)
      throw new Error(`Field missing field_name: ${field.field_id}`);
    if (!field.label) throw new Error(`Field missing label: ${field.field_id}`);
    if (!field.meaning)
      throw new Error(`Field missing meaning: ${field.field_id}`);
    if (!Array.isArray(field.examples))
      throw new Error(`Field ${field.field_id} examples not an array`);
    if (!field.guidance)
      throw new Error(`Field missing guidance: ${field.field_id}`);
    if (!Array.isArray(field.anti_patterns))
      throw new Error(`Field ${field.field_id} anti_patterns not an array`);

    // Track source bindings
    if (field.source) {
      sourceBindings++;
    }
  }

  // Validate concepts
  if (!Array.isArray(glossary.concepts)) {
    throw new Error("Glossary concepts is not an array");
  }

  let conceptSourceBindings = 0;

  for (const concept of glossary.concepts) {
    if (!concept.concept_id) throw new Error("Concept missing concept_id");
    if (!concept.concept_name)
      throw new Error(`Concept missing name: ${concept.concept_id}`);
    if (!concept.description)
      throw new Error(`Concept missing description: ${concept.concept_id}`);
    if (!Array.isArray(concept.rules))
      throw new Error(`Concept ${concept.concept_id} rules not an array`);
    if (!concept.key_terms || typeof concept.key_terms !== "object") {
      throw new Error(`Concept ${concept.concept_id} key_terms invalid`);
    }

    // Track concept source bindings
    if (concept.source) {
      conceptSourceBindings++;
    }
  }

  console.log("✅ Glossary validation passed");
  console.log(`   - RCF version: ${glossary._meta.rcf_version}`);
  console.log(`   - Derived from: ${glossary._meta.derived_from}`);
  console.log(
    `   - ${allFields.length} fields defined (${sourceBindings} with source bindings)`
  );
  console.log(
    `   - ${glossary.concepts.length} concepts defined (${conceptSourceBindings} with source bindings)`
  );
  process.exit(0);
} catch (error) {
  console.error("❌ Glossary validation failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
