import * as fs from "node:fs";
import * as path from "node:path";
import * as childProcess from "node:child_process";
import type { Registry } from "../types.js";
import { cloneOrUpdate, loadRegistry } from "../git.js";
import { loadManifest } from "../manifest.js";
import { icon, color as c } from "../ui.js";

/**
 * `agent prompt` — Browse, view, and copy prompts from the registry.
 *
 * Subcommands:
 *   agent prompt list           Show prompts for your included categories
 *   agent prompt list --all     Show all available prompts
 *   agent prompt show <key>     Display a prompt in the terminal
 *   agent prompt copy <key>     Copy a prompt to the clipboard
 */
export function cmdPrompt(args: string[]): void {
  const sub = args[0];

  if (!sub || sub === "--help") {
    console.error(`  ${icon.prompt} Usage: agent prompt <list|show|copy>`);
    console.error("");
    console.error("  Subcommands:");
    console.error(`    list              Show prompts for your included categories`);
    console.error(`    list --all        Show all available prompts`);
    console.error(`    show <key>        Display a prompt in the terminal`);
    console.error(`    copy <key>        Copy a prompt to the clipboard`);
    console.error("");
    console.error("  Keys use category/prompt format, e.g. development/code-review");
    process.exit(1);
  }

  const manifest = loadManifest();
  const repoDir = cloneOrUpdate(manifest.source, manifest.ref);
  const registry = loadRegistry(repoDir);

  switch (sub) {
    case "list": {
      const showAll = args.includes("--all");
      const includedCats = new Set(
        manifest.include.map((i) => i.split("/")[0]),
      );

      console.log(
        `\n  ${icon.prompt} ${c.bold}Available prompts${c.reset}  ${c.dim}(${showAll ? "all categories" : "your categories"})${c.reset}\n`,
      );

      let total = 0;

      for (const [catKey, cat] of Object.entries(registry.categories)) {
        if (!cat.prompts || Object.keys(cat.prompts).length === 0) continue;
        if (!showAll && !includedCats.has(catKey)) continue;

        const typeIcon = cat.type === "agent" ? icon.agent : icon.skill;
        console.log(`  ${typeIcon} ${c.bold}${cat.name}${c.reset}  ${c.dim}(${catKey})${c.reset}`);

        for (const [promptKey, filename] of Object.entries(cat.prompts)) {
          const key = `${catKey}/${promptKey}`;
          console.log(`    ${icon.prompt}  ${c.cyan}${key}${c.reset}  ${c.dim}${icon.arrow} ${filename}${c.reset}`);
          total++;
        }
        console.log();
      }

      if (total === 0) {
        if (showAll) {
          console.log(`  ${icon.info} No prompts defined in the registry.`);
        } else {
          console.log(`  ${icon.info} No prompts available for your included categories.`);
          console.log(`  ${c.dim}  Use ${c.cyan}agent prompt list --all${c.reset}${c.dim} to see all prompts.${c.reset}`);
        }
      } else {
        console.log(`  ${c.dim}Use ${c.cyan}agent prompt show <key>${c.reset}${c.dim} to view a prompt.${c.reset}`);
        console.log(`  ${c.dim}Use ${c.cyan}agent prompt copy <key>${c.reset}${c.dim} to copy to clipboard.${c.reset}`);
      }
      break;
    }

    case "show": {
      const key = args[1];
      if (!key) {
        console.error(`  ${icon.error} Usage: agent prompt show <category/prompt>`);
        console.error("  e.g. agent prompt show development/code-review");
        process.exit(1);
      }
      const content = resolvePromptContent(key, registry, repoDir);
      console.log(`\n  ${icon.prompt} ${c.bold}${key}${c.reset}\n`);
      console.log(content);
      break;
    }

    case "copy": {
      const key = args[1];
      if (!key) {
        console.error(`  ${icon.error} Usage: agent prompt copy <category/prompt>`);
        console.error("  e.g. agent prompt copy development/code-review");
        process.exit(1);
      }
      const content = resolvePromptContent(key, registry, repoDir);
      copyToClipboard(content);
      console.log(`  ${icon.success} Copied ${c.cyan}${key}${c.reset} to clipboard ${icon.clipboard}`);
      break;
    }

    default:
      console.error(`  ${icon.error} Unknown prompt subcommand: "${sub}"`);
      console.error(`  Available: list, show, copy`);
      process.exit(1);
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function resolvePromptContent(
  key: string,
  registry: Registry,
  repoDir: string,
): string {
  const [catKey, promptKey] = key.split("/");
  if (!catKey || !promptKey) {
    console.error(`  ${icon.error} Invalid prompt key: "${key}". Use "category/prompt" format.`);
    process.exit(1);
  }

  const cat = registry.categories[catKey];
  if (!cat) {
    console.error(`  ${icon.error} Unknown category: "${catKey}"`);
    process.exit(1);
  }

  if (!cat.prompts || !cat.prompts[promptKey]) {
    console.error(`  ${icon.error} Unknown prompt: "${promptKey}" in category "${catKey}"`);
    if (cat.prompts) {
      console.error(`  Available: ${Object.keys(cat.prompts).join(", ")}`);
    } else {
      console.error(`  No prompts defined for category "${catKey}"`);
    }
    process.exit(1);
  }

  const promptsPath = cat.promptsPath ?? path.join(path.dirname(cat.path), "prompts");
  const filePath = path.join(repoDir, promptsPath, cat.prompts[promptKey]);

  if (!fs.existsSync(filePath)) {
    console.error(`  ${icon.error} Prompt file not found: ${filePath}`);
    process.exit(1);
  }

  return fs.readFileSync(filePath, "utf-8");
}

function copyToClipboard(text: string): void {
  const { execSync } = childProcess;
  try {
    if (process.platform === "darwin") {
      execSync("pbcopy", { input: text });
    } else if (process.platform === "win32") {
      execSync("clip", { input: text });
    } else {
      try {
        execSync("xclip -selection clipboard", { input: text });
      } catch {
        execSync("xsel --clipboard --input", { input: text });
      }
    }
  } catch {
    console.error(`  ${icon.warning} Could not copy to clipboard. Content printed above instead.`);
    console.log(text);
  }
}
