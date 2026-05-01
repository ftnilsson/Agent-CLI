import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentManifest } from "./types.js";

const MANIFEST_FILE = ".agent.json";
const LEGACY_MANIFEST_FILE = ".skills.json";

/**
 * Load .agent.json from the current working directory.
 * Falls back to .skills.json for backward compatibility.
 */
export function loadManifest(cwd: string = process.cwd()): AgentManifest {
  const manifestPath = path.join(cwd, MANIFEST_FILE);
  const legacyPath = path.join(cwd, LEGACY_MANIFEST_FILE);

  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as AgentManifest;
  }

  // Migrate legacy .skills.json → .agent.json
  if (fs.existsSync(legacyPath)) {
    console.log(`Migrating ${LEGACY_MANIFEST_FILE} → ${MANIFEST_FILE}...`);
    const data = JSON.parse(fs.readFileSync(legacyPath, "utf-8")) as AgentManifest;
    fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2) + "\n");
    fs.unlinkSync(legacyPath);
    return data;
  }

  console.error(
    `No ${MANIFEST_FILE} found in ${cwd}.\nRun "agent init" to create one.`,
  );
  process.exit(1);
}

/**
 * Save .agent.json to the current working directory.
 */
export function saveManifest(
  manifest: AgentManifest,
  cwd: string = process.cwd(),
): void {
  const manifestPath = path.join(cwd, MANIFEST_FILE);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * Check whether a manifest file exists (including legacy name).
 */
export function manifestExists(cwd: string = process.cwd()): boolean {
  return (
    fs.existsSync(path.join(cwd, MANIFEST_FILE)) ||
    fs.existsSync(path.join(cwd, LEGACY_MANIFEST_FILE))
  );
}
