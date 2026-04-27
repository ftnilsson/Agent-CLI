import * as path from "node:path";
import type { AgentManifest } from "../types.js";
import { cloneOrUpdate, loadRegistry, getLatestRef } from "../git.js";
import { saveManifest, manifestExists } from "../manifest.js";
import { MANIFEST_FILE } from "../constants.js";
import { icon, color as c, Spinner } from "../ui.js";

/**
 * `agent init` — Create a .agent.json manifest in the current directory.
 *
 * Usage:
 *   agent init [source] [--output <dir>]
 *   agent init [source] --interactive     ← browse & pick interactively
 *
 * If no source is provided, defaults to github:ftnilsson/agent-cli
 */
export async function cmdInit(args: string[]): Promise<void> {
  if (manifestExists()) {
    console.error(
      `  ${icon.error} ${MANIFEST_FILE} already exists. Delete it first or edit manually.`,
    );
    process.exit(1);
  }

  const DEFAULT_SOURCE = "github:ftnilsson/agent-cli";
  const source = args.find((a) => !a.startsWith("--")) || DEFAULT_SOURCE;

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
