import * as fs from "node:fs";
import * as path from "node:path";
import type { Registry } from "../types.js";
import { cloneOrUpdate, loadRegistry, copyDir } from "../git.js";
import { loadManifest } from "../manifest.js";
import { LOCAL_INSTRUCTIONS_FILE } from "../constants.js";
import { loadLock, saveLock, hashPath, type LockFile } from "../lock.js";
import {
  parseInstallTarget,
  resolveAgentOutputPaths,
  resolveContentOutputDirs,
  composeSlimAgentFile,
  resolveIncludes,
  findAgentFile,
  findSkillFile,
  findMissingGitignoreEntries,
  generateSkillsIndexContent,
  type ResolvedEntry,
  type SlimFileRef,
} from "../helpers.js";
import { icon, color as c, Spinner } from "../ui.js";

/**
 * `agent install` — Pull skills and compose agent instructions.
 *
 * Reads .agent.json, clones/updates the source, and:
 *   - Skills → copied into the output directory
 *   - Agent instructions → composed into a single agent.md at project root
 *
 * Flags:
 *   --target copilot   → write to .github/copilot-instructions.md
 *   --target cursor    → write to .cursorrules
 *   --target claude    → write to CLAUDE.md
 */
export function cmdInstall(args: string[]): void {
  const manifest = loadManifest();

  if (manifest.include.length === 0) {
    console.log(
      `  ${icon.info} No skills or agents in your manifest. Use ${c.cyan}agent add <category/key>${c.reset} first.`,
    );
    return;
  }

  const target = parseInstallTarget(args, manifest.defaultTarget ?? "copilot");
  const outputPaths = resolveAgentOutputPaths(target);
  const contentDirs = resolveContentOutputDirs(target);
  const skipGitignore = args.includes("--skip-gitignore");

  console.log(`\n  ${icon.link} ${c.dim}Source:${c.reset}  ${manifest.source} @ ${c.cyan}${manifest.ref}${c.reset}`);
  console.log(`  ${icon.folder} ${c.dim}Skills:${c.reset}  ${contentDirs.skills}`);
  console.log(`  ${icon.agent} ${c.dim}Target:${c.reset}  ${target} (${outputPaths[0]})\n`);

  // 1. Load existing lock (if any) for skip-unchanged optimisation
  const existingLock = loadLock();
  const newLockFiles: LockFile["files"] = {};

  // 2. Clone / checkout
  const spinner = new Spinner(`Fetching from ${c.dim}${manifest.source}${c.reset}`);
  spinner.start();
  const repoDir = cloneOrUpdate(manifest.source, manifest.ref);
  spinner.stop(`Repository ready`);

  // 3. Load registry to resolve keys → folder paths
  const registry = loadRegistry(repoDir);

  // 4. Resolve each include entry, separating skills from agents
  const { skills, agents } = resolveIncludes(manifest.include, registry);

  // 5. Install skills to disk
  const skillRefs: SlimFileRef[] = [];

  if (skills.length > 0) {
    const outRoot = path.resolve(contentDirs.skills);
    if (fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true });
    }
    fs.mkdirSync(outRoot, { recursive: true });

    for (const { key, srcPath, destFolder } of skills) {
      const src = path.join(repoDir, srcPath);
      const dest = path.join(outRoot, destFolder);

      if (!fs.existsSync(src)) {
        console.warn(`  ${icon.warning} Skipping "${key}" — source folder not found: ${srcPath}`);
        continue;
      }

      const srcHash = hashPath(src);
      const lockEntry = existingLock?.files[key];

      if (lockEntry?.hash === srcHash && fs.existsSync(dest)) {
        // Source unchanged since last install — skip the copy
        console.log(`  ${icon.skip}  ${key} ${c.dim}(up to date)${c.reset}`);
      } else {
        copyDir(src, dest);
        console.log(`  ${icon.success}  ${key} ${icon.arrow} ${path.relative(process.cwd(), dest)}`);
      }

      newLockFiles[key] = { hash: srcHash, ref: manifest.ref };

      const skillFile = findSkillFile(dest);
      if (skillFile) {
        skillRefs.push({ label: key, filePath: skillFile.replace(/\\/g, "/") });
      }
    }

    generateSkillsIndex(outRoot, skills);
    console.log(`\n  ${icon.install} Installed ${c.bold}${skills.length}${c.reset} skill(s) into ${c.cyan}${contentDirs.skills}/${c.reset}`);
  }

  // 5. Install agents to disk
  const agentRefs: SlimFileRef[] = [];

  if (agents.length > 0) {
    const agentsOutDir = path.resolve(contentDirs.agents);
    if (fs.existsSync(agentsOutDir)) {
      fs.rmSync(agentsOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(agentsOutDir, { recursive: true });

    for (const { key, srcPath } of agents) {
      const src = path.join(repoDir, srcPath);
      const agentFile = findAgentFile(src);

      if (!agentFile) {
        console.warn(`  ${icon.warning} Skipping "${key}" — no agent.md found in: ${srcPath}`);
        continue;
      }

      const dest = path.join(agentsOutDir, `${key.replace("/", "-")}.md`);
      const srcHash = hashPath(agentFile);
      const lockEntry = existingLock?.files[key];

      if (lockEntry?.hash === srcHash && fs.existsSync(dest)) {
        console.log(`  ${icon.skip}  ${key} ${c.dim}(up to date)${c.reset}`);
      } else {
        fs.copyFileSync(agentFile, dest);
        console.log(`  ${icon.success}  ${key} ${icon.arrow} ${path.relative(process.cwd(), dest)}`);
      }

      newLockFiles[key] = { hash: srcHash, ref: manifest.ref };
      agentRefs.push({ label: key, filePath: dest.replace(/\\/g, "/") });
    }

    console.log(`\n  ${icon.install} Installed ${c.bold}${agents.length}${c.reset} agent(s) into ${c.cyan}${contentDirs.agents}/${c.reset}`);
  }

  if (skillRefs.length === 0 && agentRefs.length === 0) {
    console.log(`  ${icon.info} No valid entries found to install.`);
  }

  // 6. Compose slim output file referencing installed files on disk
  if (skillRefs.length > 0 || agentRefs.length > 0) {
    let localOverrides: string | undefined;
    const localOverridesPath = path.resolve(LOCAL_INSTRUCTIONS_FILE);
    if (fs.existsSync(localOverridesPath)) {
      const localContent = fs.readFileSync(localOverridesPath, "utf-8").trim();
      if (localContent) {
        localOverrides = localContent;
        console.log(`  ${icon.success}  ${LOCAL_INSTRUCTIONS_FILE} ${icon.arrow} ${outputPaths[0]} ${c.dim}(local overrides)${c.reset}`);
      }
    }

    const composed = composeSlimAgentFile(agentRefs, skillRefs, localOverrides);
    const fullPath = path.resolve(outputPaths[0]);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, composed);

    console.log(`\n  ${icon.compose} Composed slim index into ${c.cyan}${outputPaths[0]}${c.reset}`);
  }

  // 7. Install prompts for included categories
  const includedCats = new Set(manifest.include.map((i) => i.split("/")[0]));
  let promptCount = 0;
  const promptsOutDir = path.resolve(contentDirs.prompts);
  if (fs.existsSync(promptsOutDir)) {
    fs.rmSync(promptsOutDir, { recursive: true, force: true });
  }

  for (const [catKey, cat] of Object.entries(registry.categories)) {
    if (!cat.prompts || !includedCats.has(catKey)) continue;

    const promptsPath = cat.promptsPath ?? path.join(path.dirname(cat.path), "prompts");

    for (const [promptKey, filename] of Object.entries(cat.prompts)) {
      const src = path.join(repoDir, promptsPath, filename);
      if (!fs.existsSync(src)) {
        console.warn(`  ${icon.warning} Prompt file not found: ${promptsPath}/${filename}`);
        continue;
      }

      const destDir = path.join(promptsOutDir, catKey);
      fs.mkdirSync(destDir, { recursive: true });
      const dest = path.join(destDir, filename);
      fs.copyFileSync(src, dest);
      console.log(`  ${icon.prompt}  ${catKey}/${promptKey} ${icon.arrow} ${path.relative(process.cwd(), dest)}`);
      promptCount++;
    }
  }

  if (promptCount > 0) {
    console.log(`\n  ${icon.prompt} Installed ${c.bold}${promptCount}${c.reset} prompt(s) into ${c.cyan}${path.relative(process.cwd(), promptsOutDir)}/${c.reset}`);
  }

  // 8. .gitignore guard
  if (!skipGitignore) {
    const dirsToCheck = [contentDirs.skills, contentDirs.prompts, contentDirs.agents];
    for (const dir of dirsToCheck) {
      checkGitignore(dir);
    }
  } else {
    console.log(`\n  ${icon.info} Skipping .gitignore check ${c.dim}(--skip-gitignore)${c.reset}`);
  }

  // 9. Write lockfile
  if (Object.keys(newLockFiles).length > 0) {
    saveLock({ version: "1", files: newLockFiles });
    console.log(`\n  ${icon.success} Lockfile written ${c.dim}(.agent.lock)${c.reset}`);
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function generateSkillsIndex(outRoot: string, resolved: ResolvedEntry[]): void {
  const content = generateSkillsIndexContent(resolved);
  fs.writeFileSync(path.join(outRoot, "README.md"), content);
}

function checkGitignore(outputDir: string): void {
  const gitignorePath = path.resolve(".gitignore");

  if (!fs.existsSync(path.resolve(".git"))) return;

  const gitignoreContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : null;

  const missing = findMissingGitignoreEntries([outputDir], gitignoreContent);

  if (missing.length > 0) {
    console.log(`\n  ${icon.warning} The following generated paths are not in .gitignore:\n`);
    for (const m of missing) {
      console.log(`      ${m}`);
    }

    const additions = missing.join("\n");
    const header = "\n# agent-cli generated files\n";
    const existing = gitignoreContent ?? "";
    const newContent = existing.endsWith("\n")
      ? existing + header + additions + "\n"
      : existing + "\n" + header + additions + "\n";

    fs.writeFileSync(gitignorePath, newContent);
    console.log(`\n  ${icon.success} Auto-added to .gitignore`);
  }
}
