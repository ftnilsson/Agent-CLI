import * as path from "node:path";
import * as fs from "node:fs";
import type { AgentManifest } from "../types.js";
import { cloneOrUpdate, loadRegistry, getLatestRef } from "../git.js";
import { saveManifest, manifestExists } from "../manifest.js";
import { MANIFEST_FILE, SCHEMA_URL } from "../constants.js";
import { icon, color as c, Spinner } from "../ui.js";

/**
 * `agent init` — Create a .agent.json manifest in the current directory.
 *
 * Usage:
 *   agent init <source> [--output <dir>]
 *   agent init <source> --interactive     ← browse & pick interactively
 *
 * A source is required — e.g. github:your-org/your-registry
 */
export async function cmdInit(args: string[]): Promise<void> {
  if (manifestExists()) {
    console.error(
      `  ${icon.error} ${MANIFEST_FILE} already exists. Delete it first or edit manually.`,
    );
    process.exit(1);
  }

  const source = args.find((a) => !a.startsWith("--"));
  if (!source) {
    console.error(`  ${icon.error} A registry source is required.\n`);
    console.error(`  Usage: ${c.cyan}agent init <source>${c.reset}`);
    console.error(`  e.g.   ${c.cyan}agent init github:ftnilsson/agent-registry${c.reset}`);
    console.error(`  e.g.   ${c.cyan}agent init github:your-org/your-registry${c.reset}`);
    process.exit(1);
  }

  const outputIdx = args.indexOf("--output");
  const outputDir =
    outputIdx !== -1 && args[outputIdx + 1] ? args[outputIdx + 1] : ".agent";

  const interactive = args.includes("--interactive") || args.includes("-i");

  const spinner = new Spinner(`Resolving source: ${c.dim}${source}${c.reset}`);
  spinner.start();
  const repoDir = cloneOrUpdate(source, "HEAD");
  const ref = getLatestRef(repoDir);
  spinner.stop(`Source resolved ${c.dim}(${ref})${c.reset}`);

  const manifest: AgentManifest = {
    $schema: SCHEMA_URL,
    source,
    ref,
    outputDir,
    include: [],
    agentOutput: "agent.md",
  };

  if (interactive) {
    const registry = loadRegistry(repoDir);
    const { interactiveSelect } = await import("../interactive.js");
    const selected = await interactiveSelect(registry);
    manifest.include = selected;
  }

  saveManifest(manifest);
  writeVscodeSchemaAssociation();
  console.log(`\n  ${icon.success} Created ${c.bold}${MANIFEST_FILE}${c.reset} ${c.dim}(ref: ${ref})${c.reset}`);

  if (manifest.include.length > 0) {
    console.log(`  ${icon.skill} Selected ${manifest.include.length} item(s).`);
    console.log(`\n  ${icon.arrow} Run ${c.bold}agent install${c.reset} to download everything.`);
  } else {
    console.log(`\n  ${c.bold}Next steps:${c.reset}`);
    console.log(`  ${c.dim}1.${c.reset} Add skills:               ${c.cyan}agent add development/architecture${c.reset}`);
    console.log(`  ${c.dim}2.${c.reset} Add agent instructions:   ${c.cyan}agent add agents/nextjs${c.reset}`);
    console.log(`  ${c.dim}3.${c.reset} Install everything:       ${c.cyan}agent install${c.reset}`);
    console.log(`  ${c.dim}4.${c.reset} Browse what's available:  ${c.cyan}agent list --remote${c.reset}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates or updates `.vscode/settings.json` to associate the agent-cli JSON
 * Schema with `.agent.json`, enabling autocomplete and inline validation in
 * VS Code without requiring a manual `$schema` lookup.
 */
function writeVscodeSchemaAssociation(cwd: string = process.cwd()): void {
  const vscodeDir = path.join(cwd, ".vscode");
  const settingsPath = path.join(vscodeDir, "settings.json");

  const schemaEntry = { fileMatch: [".agent.json"], url: SCHEMA_URL };

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
    } catch {
      // Malformed settings.json — leave it alone
      return;
    }
  }

  const existing = (settings["json.schemas"] as typeof schemaEntry[] | undefined) ?? [];
  const alreadyPresent = existing.some((e) => e.fileMatch?.includes(".agent.json"));
  if (alreadyPresent) return;

  settings["json.schemas"] = [...existing, schemaEntry];

  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
