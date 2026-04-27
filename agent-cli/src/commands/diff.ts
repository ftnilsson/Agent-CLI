import * as fs from "node:fs";
import * as path from "node:path";
import { cloneOrUpdate, loadRegistry } from "../git.js";
import { loadManifest } from "../manifest.js";
import { LOCAL_INSTRUCTIONS_FILE } from "../constants.js";
import {
  parseInstallTarget,
  resolveAgentOutputPaths,
  resolveContentOutputDirs,
  composeSlimAgentFile,
  resolveIncludes,
  findSkillFile,
  hasDifferences,
  type SlimFileRef,
} from "../helpers.js";
import { icon, color as c, Spinner } from "../ui.js";

/**
 * `agent diff` — Preview what would change on next install.
 *
 * Shows files that would be added, updated, or removed compared to what's
 * currently on disk.
 */
export function cmdDiff(args: string[]): void {
  const manifest = loadManifest();

  if (manifest.include.length === 0) {
    console.log(`  ${icon.info} No entries in manifest. Nothing to diff.`);
    return;
  }

  const target = parseInstallTarget(args, manifest.defaultTarget ?? "copilot");
  const outputPaths = resolveAgentOutputPaths(target);
  const contentDirs = resolveContentOutputDirs(target);
  const agentOutputPath = outputPaths[0];

  const spinner = new Spinner("Comparing manifest against installed files");
  spinner.start();

  const repoDir = cloneOrUpdate(manifest.source, manifest.ref);
  const registry = loadRegistry(repoDir);
  const { skills, agents } = resolveIncludes(manifest.include, registry);
  spinner.stop("Comparison ready");

  let changes = 0;

  console.log();

  // ── Skills diff ──
  const outRoot = path.resolve(contentDirs.skills);

  for (const { key, srcPath, destFolder } of skills) {
    const dest = path.join(outRoot, destFolder);
    if (!fs.existsSync(dest)) {
      console.log(`  ${c.green}+${c.reset}  ${key}  ${c.dim}(new)${c.reset}`);
      changes++;
    } else {
      const src = path.join(repoDir, srcPath);
      if (fs.existsSync(src) && hasDifferences(src, dest)) {
        console.log(`  ${c.yellow}~${c.reset}  ${key}  ${c.dim}(modified)${c.reset}`);
        changes++;
      } else {
        console.log(`  ${c.dim}=${c.reset}  ${key}  ${c.dim}(unchanged)${c.reset}`);
      }
    }
  }

  // Check for skills installed but no longer in manifest
  if (fs.existsSync(outRoot)) {
    const installedDirs = fs.readdirSync(outRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    const expectedDirs = new Set(skills.map((s) => s.destFolder));
    for (const dir of installedDirs) {
      if (!expectedDirs.has(dir)) {
        console.log(`  ${c.magenta}-${c.reset}  ${dir}  ${c.dim}(will be removed)${c.reset}`);
        changes++;
      }
    }
  }

  // ── Slim output file diff ──
  if (skills.length > 0 || agents.length > 0) {
    const outputPath = path.resolve(agentOutputPath);
    if (!fs.existsSync(outputPath)) {
      console.log(`  ${c.green}+${c.reset}  ${agentOutputPath}  ${c.dim}(new \u2014 will be created)${c.reset}`);
      changes++;
    } else {
      const skillRefs: SlimFileRef[] = skills
        .map(({ key, destFolder }) => {
          const skillPath = path.join(outRoot, destFolder);
          const skillFile = findSkillFile(skillPath);
          return skillFile ? { label: key, filePath: skillFile.replace(/\\/g, "/") } : null;
        })
        .filter((r): r is SlimFileRef => r !== null);

      const agentsOutDir = path.resolve(contentDirs.agents);
      const agentRefs: SlimFileRef[] = agents
        .map(({ key }) => {
          const dest = path.join(agentsOutDir, `${key.replace("/", "-")}.md`);
          return { label: key, filePath: dest.replace(/\\/g, "/") };
        });

      let localOverrides: string | undefined;
      const localPath = path.resolve(LOCAL_INSTRUCTIONS_FILE);
      if (fs.existsSync(localPath)) {
        const local = fs.readFileSync(localPath, "utf-8").trim();
        if (local) localOverrides = local;
      }

      const newContent = composeSlimAgentFile(agentRefs, skillRefs, localOverrides);
      const currentContent = fs.readFileSync(outputPath, "utf-8");
      if (newContent !== currentContent) {
        console.log(`  ${c.yellow}~${c.reset}  ${agentOutputPath}  ${c.dim}(index modified)${c.reset}`);
        changes++;
      } else {
        console.log(`  ${c.dim}=${c.reset}  ${agentOutputPath}  ${c.dim}(unchanged)${c.reset}`);
      }
    }
  }

  const summary = changes === 0
    ? `${icon.success} No changes detected.`
    : `${icon.diff} ${c.bold}${changes}${c.reset} change(s) detected. Run ${c.bold}agent install${c.reset} to apply.`;
  console.log(`\n  ${summary}`);
}
