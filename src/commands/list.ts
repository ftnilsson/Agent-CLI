import { cloneOrUpdate, loadRegistry, getLatestRef } from "../git.js";
import { loadManifest } from "../manifest.js";
import { icon, color as c } from "../ui.js";

/**
 * `agent list` — Show skills/agents in the manifest or in the remote registry.
 *
 * --remote   Show all available entries in the registry (requires clone).
 * (default)  Show locally included entries.
 */
export function cmdList(args: string[]): void {
  const remote = args.includes("--remote");

  if (remote) {
    const manifest = loadManifest();
    const repoDir = cloneOrUpdate(manifest.source, "HEAD");
    const latestRef = getLatestRef(repoDir);
    const registry = loadRegistry(repoDir);

    console.log(`\nAvailable resources  (${manifest.source} @ ${c.cyan}${latestRef}${c.reset})\n`);

    if (manifest.ref !== latestRef) {
      console.log(
        `  ${icon.info} Your manifest is pinned to ${c.dim}${manifest.ref}${c.reset}. Run ${c.cyan}agent update${c.reset} to use the latest ref.`,
      );
      console.log();
    }

    for (const [catKey, cat] of Object.entries(registry.categories)) {
      const typeLabel = cat.type === "agent" ? ` ${icon.agent}` : ` ${icon.skill}`;
      console.log(`  ${c.bold}${cat.name}${c.reset}${typeLabel}  ${c.dim}(${catKey})${c.reset}`);
      console.log(`  ${c.dim}${cat.description}${c.reset}`);
      for (const [skillKey, folder] of Object.entries(cat.skills)) {
        const included = manifest.include.includes(`${catKey}/${skillKey}`);
        const marker = included ? `${c.green}${icon.included}${c.reset}` : `${c.dim}${icon.available}${c.reset}`;
        console.log(`    ${marker}  ${catKey}/${skillKey}  ${icon.arrow}  ${c.dim}${folder}${c.reset}`);
      }
      if (cat.prompts && Object.keys(cat.prompts).length > 0) {
        const promptCount = Object.keys(cat.prompts).length;
        console.log(`    ${icon.prompt}  ${c.dim}${promptCount} prompt(s) available — use ${c.cyan}agent prompt list${c.reset}${c.dim} to browse${c.reset}`);
      }
      console.log();
    }

    console.log(`  ${c.green}${icon.included}${c.reset}  = included in your manifest`);
    console.log(`  ${c.dim}${icon.available}${c.reset}  = available but not included\n`);
  } else {
    const manifest = loadManifest();

    if (manifest.include.length === 0) {
      console.log(`  ${icon.info} No entries included. Use ${c.cyan}agent add <category/key>${c.reset}.`);
      return;
    }

    console.log(`\n  ${icon.list} Included entries  ${c.dim}(${manifest.source} @ ${manifest.ref})${c.reset}\n`);
    for (const entry of manifest.include) {
      console.log(`    ${icon.bullet}  ${entry}`);
    }
    console.log();
  }
}
