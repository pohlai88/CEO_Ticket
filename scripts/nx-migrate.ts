#!/usr/bin/env tsx
/**
 * nx-migrate.ts — CEO_Ticket Constitutional Migration Engine
 *
 * This is a consumer wrapper for @nexus/ui-guard migration tooling.
 * Converts legacy Tailwind patterns to constitutional NX semantic tokens.
 *
 * Usage:
 *   npm run nx:migrate:dry   # Preview changes
 *   npm run nx:migrate       # Apply changes
 *
 * @see https://github.com/pohlai88/NEXUS_UI_GUARD
 */

import * as fs from "node:fs";
import * as path from "node:path";

/* ============================================================
 * Configuration for CEO_Ticket
 * ============================================================ */

const PROJECT_ROOT = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");

// Directories to migrate
const SCAN_DIRS = [
  path.join(PROJECT_ROOT, "app"),
  path.join(PROJECT_ROOT, "components"),
];

// File extensions to migrate
const FILE_EXTENSIONS = [".tsx", ".jsx"];

// Skip patterns
const SKIP_PATTERNS = ["node_modules", ".next", "dist"];

/* ============================================================
 * Migration Map — Raw Tailwind → NX Semantic
 * ============================================================
 *
 * This map converts forbidden patterns to constitutional alternatives.
 * Based on @nexus/ui-guard FORBIDDEN_PATTERNS and NX_SEMANTICS.
 * ============================================================ */

const MIGRATION_MAP: Record<string, string> = {
  // === BACKGROUND COLORS ===
  // Grays → Surfaces
  "bg-gray-50": "bg-nx-canvas",
  "bg-gray-100": "bg-nx-surface-well",
  "bg-white": "bg-nx-surface",
  "bg-slate-50": "bg-nx-canvas",
  "bg-slate-100": "bg-nx-surface-well",
  "bg-neutral-50": "bg-nx-canvas",
  "bg-neutral-100": "bg-nx-surface-well",
  "bg-zinc-50": "bg-nx-canvas",
  "bg-zinc-100": "bg-nx-surface-well",

  // Blues/Indigos → Primary
  "bg-blue-50": "bg-nx-primary-light",
  "bg-blue-100": "bg-nx-primary-light",
  "bg-blue-500": "bg-nx-primary",
  "bg-blue-600": "bg-nx-primary",
  "bg-blue-700": "bg-nx-primary-hover",
  "bg-indigo-50": "bg-nx-primary-light",
  "bg-indigo-100": "bg-nx-primary-light",
  "bg-indigo-500": "bg-nx-primary",
  "bg-indigo-600": "bg-nx-primary",
  "bg-indigo-700": "bg-nx-primary-hover",

  // Greens → Success
  "bg-green-50": "bg-nx-success-bg",
  "bg-green-100": "bg-nx-success-bg",
  "bg-green-500": "bg-nx-success",
  "bg-green-600": "bg-nx-success",
  "bg-emerald-50": "bg-nx-success-bg",
  "bg-emerald-100": "bg-nx-success-bg",
  "bg-emerald-500": "bg-nx-success",
  "bg-emerald-600": "bg-nx-success",

  // Reds → Danger
  "bg-red-50": "bg-nx-danger-bg",
  "bg-red-100": "bg-nx-danger-bg",
  "bg-red-500": "bg-nx-danger",
  "bg-red-600": "bg-nx-danger",

  // Yellows/Ambers → Warning
  "bg-yellow-50": "bg-nx-warning-bg",
  "bg-yellow-100": "bg-nx-warning-bg",
  "bg-yellow-500": "bg-nx-warning",
  "bg-amber-50": "bg-nx-warning-bg",
  "bg-amber-100": "bg-nx-warning-bg",
  "bg-amber-500": "bg-nx-warning",

  // Cyans → Info
  "bg-cyan-50": "bg-nx-info-bg",
  "bg-cyan-100": "bg-nx-info-bg",
  "bg-cyan-500": "bg-nx-info",

  // === TEXT COLORS ===
  // Grays → Text Hierarchy
  "text-gray-900": "text-nx-text-main",
  "text-gray-800": "text-nx-text-main",
  "text-gray-700": "text-nx-text-sub",
  "text-gray-600": "text-nx-text-sub",
  "text-gray-500": "text-nx-text-muted",
  "text-gray-400": "text-nx-text-faint",
  "text-slate-900": "text-nx-text-main",
  "text-slate-700": "text-nx-text-sub",
  "text-slate-600": "text-nx-text-sub",
  "text-slate-500": "text-nx-text-muted",
  "text-neutral-900": "text-nx-text-main",
  "text-neutral-700": "text-nx-text-sub",
  "text-neutral-600": "text-nx-text-sub",
  "text-neutral-500": "text-nx-text-muted",
  "text-zinc-900": "text-nx-text-main",
  "text-zinc-700": "text-nx-text-sub",
  "text-zinc-600": "text-nx-text-sub",
  "text-zinc-500": "text-nx-text-muted",
  "text-white": "text-nx-text-inverse",

  // Colors → Semantic
  "text-blue-500": "text-nx-primary",
  "text-blue-600": "text-nx-primary",
  "text-blue-700": "text-nx-primary",
  "text-indigo-500": "text-nx-primary",
  "text-indigo-600": "text-nx-primary",
  "text-green-500": "text-nx-success",
  "text-green-600": "text-nx-success",
  "text-green-700": "text-nx-success-text",
  "text-emerald-500": "text-nx-success",
  "text-emerald-600": "text-nx-success",
  "text-emerald-700": "text-nx-success-text",
  "text-red-500": "text-nx-danger",
  "text-red-600": "text-nx-danger",
  "text-red-700": "text-nx-danger-text",
  "text-yellow-500": "text-nx-warning",
  "text-yellow-600": "text-nx-warning",
  "text-amber-500": "text-nx-warning",
  "text-amber-600": "text-nx-warning",
  "text-amber-700": "text-nx-warning-text",
  "text-cyan-500": "text-nx-info",
  "text-cyan-600": "text-nx-info",

  // === BORDER COLORS ===
  "border-gray-100": "border-nx-border",
  "border-gray-200": "border-nx-border",
  "border-gray-300": "border-nx-border-strong",
  "border-slate-200": "border-nx-border",
  "border-slate-300": "border-nx-border-strong",
  "border-neutral-200": "border-nx-border",
  "border-neutral-300": "border-nx-border-strong",
  "border-zinc-200": "border-nx-border",
  "border-zinc-300": "border-nx-border-strong",
  "border-blue-500": "border-nx-primary",
  "border-indigo-500": "border-nx-primary",
  "border-green-500": "border-nx-success",
  "border-emerald-500": "border-nx-success",
  "border-red-500": "border-nx-danger",
  "border-yellow-500": "border-nx-warning",
  "border-amber-500": "border-nx-warning",

  // === RING COLORS ===
  "ring-blue-500": "ring-nx-ring",
  "ring-indigo-500": "ring-nx-ring",
  "ring-indigo-600": "ring-nx-ring",

  // === HOVER STATES ===
  "hover:bg-gray-50": "hover:bg-nx-surface-well",
  "hover:bg-gray-100": "hover:bg-nx-selected",
  "hover:bg-blue-600": "hover:bg-nx-primary-hover",
  "hover:bg-blue-700": "hover:bg-nx-primary-hover",
  "hover:bg-indigo-600": "hover:bg-nx-primary-hover",
  "hover:bg-indigo-700": "hover:bg-nx-primary-hover",
  "hover:bg-red-700": "hover:bg-nx-danger-hover",
  "hover:bg-green-700": "hover:bg-nx-success-hover",

  // === FOCUS STATES ===
  "focus:ring-blue-500": "focus:ring-nx-ring",
  "focus:ring-indigo-500": "focus:ring-nx-ring",
  "focus:border-blue-500": "focus:border-nx-primary",
  "focus:border-indigo-500": "focus:border-nx-primary",

  // === TEXT -800 VARIANTS (on colored backgrounds) ===
  "text-blue-800": "text-nx-primary",
  "text-green-800": "text-nx-success-text",
  "text-red-800": "text-nx-danger-text",
  "text-yellow-800": "text-nx-warning-text",
  "text-amber-800": "text-nx-warning-text",
  "text-purple-800": "text-nx-info-text",

  // === BORDER -200 VARIANTS (light borders on status backgrounds) ===
  "border-green-200": "border-nx-success",
  "border-red-200": "border-nx-danger",
  "border-yellow-200": "border-nx-warning",
  "border-amber-200": "border-nx-warning",

  // === PURPLE → INFO (contextual/notification color) ===
  "bg-purple-50": "bg-nx-info-bg",
  "bg-purple-100": "bg-nx-info-bg",
  "bg-purple-500": "bg-nx-info",
  "bg-purple-600": "bg-nx-info",
  "text-purple-500": "text-nx-info",
  "text-purple-600": "text-nx-info",

  // === DARK MODE VARIANTS (explicit dark backgrounds) ===
  "dark:bg-amber-900/20": "dark:bg-nx-warning-bg",
  "dark:bg-blue-900/20": "dark:bg-nx-primary-light",
  "dark:text-blue-300": "dark:text-nx-primary",
  "bg-red-800": "bg-nx-danger",
};

/* ============================================================
 * File Walking
 * ============================================================ */

function* walkFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (SKIP_PATTERNS.some((skip) => fullPath.includes(skip))) continue;

    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (FILE_EXTENSIONS.includes(ext)) {
        yield fullPath;
      }
    }
  }
}

/* ============================================================
 * Migration Engine
 * ============================================================ */

interface Replacement {
  file: string;
  line: number;
  from: string;
  to: string;
}

function migrateFile(filePath: string): Replacement[] {
  const replacements: Replacement[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;

    for (const [from, to] of Object.entries(MIGRATION_MAP)) {
      // Match as word boundary to avoid partial matches
      const regex = new RegExp(
        `\\b${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "g"
      );

      if (regex.test(line)) {
        replacements.push({
          file: filePath,
          line: lineNum,
          from,
          to,
        });

        if (!DRY_RUN) {
          line = line.replace(regex, to);
          lines[i] = line;
        }
      }
    }
  }

  if (!DRY_RUN && replacements.length > 0) {
    fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  }

  return replacements;
}

/* ============================================================
 * Main
 * ============================================================ */

async function main(): Promise<void> {
  console.log("⚖️ nx-migrate: Constitutional Migration Engine");
  console.log(
    `   Mode: ${
      DRY_RUN ? "DRY RUN (no files modified)" : "LIVE (modifying files)"
    }`
  );
  console.log(`   Project: CEO_Ticket`);
  console.log("");

  const allReplacements: Replacement[] = [];
  let filesScanned = 0;

  for (const dir of SCAN_DIRS) {
    for (const file of walkFiles(dir)) {
      filesScanned++;
      const replacements = migrateFile(file);
      allReplacements.push(...replacements);
    }
  }

  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("  MIGRATION REPORT");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log(`   Files scanned:    ${filesScanned}`);
  console.log(`   Replacements:     ${allReplacements.length}`);
  console.log("");

  if (allReplacements.length === 0) {
    console.log("✅ nx-migrate COMPLETE: No patterns to migrate");
    return;
  }

  // Group by file
  const byFile = new Map<string, Replacement[]>();
  for (const r of allReplacements) {
    const existing = byFile.get(r.file) || [];
    existing.push(r);
    byFile.set(r.file, existing);
  }

  for (const [file, replacements] of byFile) {
    const relPath = path.relative(PROJECT_ROOT, file);
    console.log(`📄 ${relPath}`);
    for (const r of replacements) {
      console.log(`   L${r.line}: ${r.from} → ${r.to}`);
    }
    console.log("");
  }

  if (DRY_RUN) {
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
    console.log("  DRY RUN COMPLETE — No files were modified.");
    console.log("  Run without --dry-run to apply changes.");
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
  } else {
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
    console.log(
      `  ✅ MIGRATION COMPLETE: ${allReplacements.length} replacements applied`
    );
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
  }
}

main().catch((err) => {
  console.error("❌ nx-migrate failed:", err);
  process.exit(1);
});
