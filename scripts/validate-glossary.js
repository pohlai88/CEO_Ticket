#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const glossaryPath = path.join(__dirname, '..', 'docs', 'glossary.ui.json');

try {
  const glossaryContent = fs.readFileSync(glossaryPath, 'utf-8');
  const glossary = JSON.parse(glossaryContent);

  // Validate structure
  if (!glossary.version) {
    throw new Error('Glossary missing version field');
  }

  if (!glossary.scopes) {
    throw new Error('Glossary missing scopes object');
  }

  // Check all scopes have array of fields
  const requiredScopes = ['onboarding', 'request_form', 'approval', 'admin_config'];
  for (const scope of requiredScopes) {
    if (!Array.isArray(glossary.scopes[scope])) {
      throw new Error(`Glossary scope "${scope}" is not an array`);
    }
  }

  // Validate each field has required properties
  const allFields = Object.values(glossary.scopes).flat();
  for (const field of allFields) {
    if (!field.field_id) throw new Error(`Field missing field_id: ${JSON.stringify(field)}`);
    if (!field.field_name) throw new Error(`Field missing field_name: ${field.field_id}`);
    if (!field.label) throw new Error(`Field missing label: ${field.field_id}`);
    if (!field.meaning) throw new Error(`Field missing meaning: ${field.field_id}`);
    if (!Array.isArray(field.examples)) throw new Error(`Field ${field.field_id} examples not an array`);
    if (!field.guidance) throw new Error(`Field missing guidance: ${field.field_id}`);
    if (!Array.isArray(field.anti_patterns)) throw new Error(`Field ${field.field_id} anti_patterns not an array`);
  }

  // Validate concepts
  if (!Array.isArray(glossary.concepts)) {
    throw new Error('Glossary concepts is not an array');
  }

  for (const concept of glossary.concepts) {
    if (!concept.concept_id) throw new Error('Concept missing concept_id');
    if (!concept.concept_name) throw new Error(`Concept missing name: ${concept.concept_id}`);
    if (!concept.description) throw new Error(`Concept missing description: ${concept.concept_id}`);
    if (!Array.isArray(concept.rules)) throw new Error(`Concept ${concept.concept_id} rules not an array`);
    if (!concept.key_terms || typeof concept.key_terms !== 'object') {
      throw new Error(`Concept ${concept.concept_id} key_terms invalid`);
    }
  }

  console.log('✅ Glossary validation passed');
  console.log(`   - ${allFields.length} fields defined`);
  console.log(`   - ${glossary.concepts.length} concepts defined`);
  process.exit(0);
} catch (error) {
  console.error('❌ Glossary validation failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
