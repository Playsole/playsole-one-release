import fs from 'node:fs';
import path from 'node:path';

/**
 * Hosting Portability Checker
 * Enforces rule `cloudflare-workers-deploy`:
 * Application code must remain 100% portable without
 * importing proprietary cloud vendor platform SDKs.
 */

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"]@railway\//,
  /require\(['"]@railway\//,
  /from\s+['"]railway['"]/,
  /require\(['"]railway['"]/,
];

const SCAN_DIRS = ['gateway', 'services', 'packages'];
const EXCLUDED_DIRS = ['node_modules', 'dist', '.data'];

let totalFilesChecked = 0;
const violations: Array<{ file: string; line: number; match: string }> = [];

function scanDirectory(dir: string): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      totalFilesChecked++;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(process.cwd(), fullPath),
              line: i + 1,
              match: line.trim(),
            });
          }
        }
      }
    }
  }
}

console.log('[Portability Check] Scanning application code for platform SDK lock-in...');

for (const dir of SCAN_DIRS) {
  scanDirectory(path.join(process.cwd(), dir));
}

console.log(`[Portability Check] Scanned ${totalFilesChecked} source files across ${SCAN_DIRS.join(', ')}.`);

if (violations.length > 0) {
  console.error('\n[Portability Check FAILED] Found forbidden platform-locked imports:');
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} -> ${v.match}`);
  }
  console.error('\nPer architectural rule `cloudflare-workers-deploy`, application code must remain portable without proprietary vendor SDKs.\n');
  process.exit(1);
}

console.log('[Portability Check PASSED] Zero platform-locked SDK dependencies found in application code.\n');
