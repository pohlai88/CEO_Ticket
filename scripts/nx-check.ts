#!/usr/bin/env tsx
/**
 * nx-check.ts — CEO_Ticket Constitutional Compliance Scanner
 *
 * This is a consumer wrapper for @nexus/ui-guard's nx-check script.
 * It configures the correct scan directories for this project.
 *
 * @see https://github.com/pohlai88/NEXUS_UI_GUARD
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

/* ============================================================
 * Configuration for CEO_Ticket
 * ============================================================ */

const PROJECT_ROOT = process.cwd();

// Directories to scan for constitutional violations
const SCAN_DIRS = [
  path.join(PROJECT_ROOT, "app"),
  path.join(PROJECT_ROOT, "components"),
  path.join(PROJECT_ROOT, "lib"),
];

// File extensions to check
const FILE_EXTENSIONS = [".tsx", ".ts", ".css", ".jsx", ".js"];

// Files/directories to skip
const SKIP_PATTERNS = [
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".turbo",
  "globals.css", // Contains constitutional imports and dark mode overrides
];

/* ============================================================
 * Load Forbidden Patterns from UI_GUARD
 * ============================================================ */

interface CanonicalData {
  FORBIDDEN_PATTERNS: readonly string[];
}

interface Violation {
  file: string;
  line: number;
  pattern: string;
  content: string;
}

async function loadForbiddenPatterns(): Promise<readonly string[]> {
  const canonicalPath = path.join(
    PROJECT_ROOT,
    "node_modules",
    "@nexus",
    "ui-guard",
    "ui",
    "canonical.ts"
  );

  if (!fs.existsSync(canonicalPath)) {
    console.error("❌ Cannot find @nexus/ui-guard canonical.ts");
    console.error("   Run: npm install @nexus/ui-guard");
    process.exit(1);
  }

  const canonicalUrl = pathToFileURL(canonicalPath).href;
  const canonical = (await import(canonicalUrl)) as CanonicalData;

  return canonical.FORBIDDEN_PATTERNS;
}

/* ============================================================
 * File Walking
 * ============================================================ */

function* walkFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (SKIP_PATTERNS.some((skip) => fullPath.includes(skip))) {
      continue;
    }

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
 * Pattern Checking
 * ============================================================ */

function checkFileForViolations(
  filePath: string,
  patterns: readonly string[]
): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("/*")) {
      continue;
    }

    for (const pattern of patterns) {
      // Convert pattern to regex (handle wildcards)
      const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\*/g, ".*")
        .replace(/\\-/g, "-");

      const regex = new RegExp(regexPattern, "i");

      if (regex.test(line)) {
        violations.push({
          file: filePath,
          line: lineNum,
          pattern,
          content: line.trim().substring(0, 80),
        });
      }
    }
  }

  return violations;
}

/* ============================================================
 * Main
 * ============================================================ */

async function main(): Promise<void> {
  console.log("🔍 nx-check: Scanning for constitutional violations...");
  console.log(`   Project: CEO_Ticket`);
  console.log(`   Directories: app/, components/, lib/`);
  console.log("");

  const patterns = await loadForbiddenPatterns();
  console.log(`   Loaded ${patterns.length} forbidden patterns`);

  const allViolations: Violation[] = [];
  let filesScanned = 0;

  for (const dir of SCAN_DIRS) {
    for (const file of walkFiles(dir)) {
      filesScanned++;
      const violations = checkFileForViolations(file, patterns);
      allViolations.push(...violations);
    }
  }

  console.log(`   Scanned ${filesScanned} files`);
  console.log("");

  if (allViolations.length === 0) {
    console.log("✅ nx-check complete: No constitutional violations found!");
    process.exit(0);
  }

  // Group by file
  const byFile = new Map<string, Violation[]>();
  for (const v of allViolations) {
    const existing = byFile.get(v.file) || [];
    existing.push(v);
    byFile.set(v.file, existing);
  }

  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("  ❌ CONSTITUTIONAL VIOLATIONS DETECTED");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("");

  for (const [file, violations] of byFile) {
    const relPath = path.relative(PROJECT_ROOT, file);
    console.log(`📄 ${relPath}`);
    for (const v of violations) {
      console.log(`   L${v.line}: [${v.pattern}] ${v.content}`);
    }
    console.log("");
  }

  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log(
    `  Total: ${allViolations.length} violations in ${byFile.size} files`
  );
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("");
  console.log("📖 Reference: NEXUS DESIGN CONSTITUTION v1.0.0");
  console.log("   Use semantic tokens (nx-*) instead of raw Tailwind colors.");
  console.log("");

  process.exit(1);
}

main().catch((err) => {
  console.error("❌ nx-check failed:", err);
  process.exit(1);
});
