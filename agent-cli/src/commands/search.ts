import * as fs from "node:fs";
import * as path from "node:path";
import { cloneOrUpdate, loadRegistry, getLatestRef } from "../git.js";
import { loadManifest } from "../manifest.js";
import { icon, color as c, Spinner } from "../ui.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  key: string;
  folder: string;
  category: string;
  categoryName: string;
  type: "skill" | "prompt" | "agent";
  description: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Try to extract the first `# ` heading from a SKILL.md or README.md in the
 * given directory. Returns null when no suitable file is found.
 */
function readFirstHeading(dir: string): string | null {
  for (const filename of ["SKILL.md", "README.md"]) {
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)/);
      if (match) return match[1].trim();
    }
  }
  return null;
}

function matches(query: string, ...targets: string[]): boolean {
  const lower = query.toLowerCase();
  return targets.some((t) => t.toLowerCase().includes(lower));
}

// ─── Command ──────────────────────────────────────────────────────────────────

/**
 * `agent search <query>` — Find skills, agents, and prompts in the registry.
 *
 * --json   Output results as JSON (machine-readable).
 */
export function cmdSearch(args: string[]): void {
  const jsonMode = args.includes("--json");
  const query = args.filter((a) => !a.startsWith("--")).join(" ").trim();

  if (!query) {
    console.error(`  ${icon.error} Usage: agent search <query> [--json]`);
    console.error("  e.g. agent search auth");
    process.exit(1);
  }

  const manifest = loadManifest();
  const spinner = new Spinner("Loading registry");
  spinner.start();
  const repoDir = cloneOrUpdate(manifest.source, "HEAD");
  const latestRef = getLatestRef(repoDir);
  const registry = loadRegistry(repoDir);
  spinner.stop("Registry loaded");

  const results: SearchResult[] = [];

  for (const [catKey, cat] of Object.entries(registry.categories)) {
    const catType = cat.type === "agent" ? "agent" : "skill";

    // ── Skills ────────────────────────────────────────────────────────────────
    for (const [skillKey, folder] of Object.entries(cat.skills)) {
      if (!matches(query, catKey, cat.name, cat.description, skillKey, folder)) continue;

      const skillDir = path.join(repoDir, cat.path, folder);
      const description = fs.existsSync(skillDir) ? readFirstHeading(skillDir) : null;

      results.push({
        key: `${catKey}/${skillKey}`,
        folder,
        category: catKey,
        categoryName: cat.name,
        type: catType,
        description,
      });
    }

    // ── Prompts ───────────────────────────────────────────────────────────────
    if (cat.prompts && cat.promptsPath) {
      for (const [promptKey, filename] of Object.entries(cat.prompts)) {
        if (!matches(query, catKey, cat.name, promptKey, filename)) continue;

        results.push({
          key: `${catKey}/${promptKey}`,
          folder: filename,
          category: catKey,
          categoryName: cat.name,
          type: "prompt",
          description: null,
        });
      }
    }
  }

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(
      `\n  ${icon.search} No results for ${c.cyan}"${query}"${c.reset}\n` +
        `  Try ${c.cyan}agent list --remote${c.reset} to browse everything.\n`,
    );
    return;
  }

  console.log(
    `\n  ${icon.search} Search results for ${c.cyan}"${query}"${c.reset}` +
      `  ${c.dim}(${manifest.source} @ ${latestRef})${c.reset}\n`,
  );

  // Group by category for a cleaner display
  const byCategory = new Map<string, SearchResult[]>();
  for (const r of results) {
    const group = byCategory.get(r.category) ?? [];
    group.push(r);
    byCategory.set(r.category, group);
  }

  for (const [, group] of byCategory) {
    const first = group[0];
    const typeIcon = first.type === "agent" ? icon.agent : first.type === "prompt" ? icon.prompt : icon.skill;
    console.log(`  ${c.bold}${first.categoryName}${c.reset}  ${typeIcon}  ${c.dim}(${first.category})${c.reset}`);

    for (const r of group) {
      const typeLabel =
        r.type === "prompt" ? `${c.dim}[prompt]${c.reset} ` : r.type === "agent" ? `${c.dim}[agent]${c.reset} ` : "";
      const desc = r.description ? `  ${c.dim}— ${r.description}${c.reset}` : "";
      console.log(`    ${icon.bullet}  ${c.cyan}${r.key}${c.reset}  ${typeLabel}${icon.arrow}  ${c.dim}${r.folder}${c.reset}${desc}`);
    }
    console.log();
  }

  console.log(
    `  ${c.dim}${results.length} result${results.length === 1 ? "" : "s"} found.` +
      `  Use ${c.reset}${c.cyan}agent add <key>${c.reset}${c.dim} to include a skill.${c.reset}\n`,
  );
}
