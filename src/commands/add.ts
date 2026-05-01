import { cloneOrUpdate, loadRegistry, getLatestRef } from "../git.js";
import { loadManifest, saveManifest } from "../manifest.js";
import { icon, color as c, Spinner } from "../ui.js";

const categoryAliases: Record<string, string> = {
  aws: "aws-cloud",
  azure: "azure-cloud",
};

function normalizeCategoryKey(categoryKey: string): string {
  return categoryAliases[categoryKey] ?? categoryKey;
}

/**
 * `agent add <category/key> [...]` — Add one or more skills/agents to the manifest.
 *
 * Validates against the remote registry.
 */
export function cmdAdd(args: string[]): void {
  if (args.length === 0) {
    console.error(`  ${icon.error} Usage: agent add <category/key> [<category/key> ...]`);
    console.error("  e.g. agent add development/architecture agents/nextjs");
    process.exit(1);
  }

  const manifest = loadManifest();
  const spinner = new Spinner("Validating against registry");
  spinner.start();
  const repoDir = cloneOrUpdate(manifest.source, "HEAD");
  const latestRef = getLatestRef(repoDir);
  const registry = loadRegistry(repoDir);
  spinner.stop("Registry loaded");

  let refUpdated = false;
  if (manifest.ref !== latestRef) {
    manifest.ref = latestRef;
    refUpdated = true;
  }

  let added = 0;

  for (const rawEntry of args) {
    const entry = rawEntry.includes("/") ? rawEntry : `${rawEntry}/*`;

    // Support adding a whole category with "category/*"
    if (entry.endsWith("/*")) {
      const catKey = normalizeCategoryKey(entry.slice(0, -2));
      const cat = registry.categories[catKey];
      if (!cat) {
        console.error(`  ${icon.error} Unknown category: "${entry.slice(0, -2)}"`);
        continue;
      }
      for (const skillKey of Object.keys(cat.skills)) {
        const full = `${catKey}/${skillKey}`;
        if (!manifest.include.includes(full)) {
          manifest.include.push(full);
          console.log(`  ${icon.add}  ${full}`);
          added++;
        }
      }
      continue;
    }

    // Validate "category/key"
    const [rawCatKey, skillKey] = entry.split("/");
    const catKey = normalizeCategoryKey(rawCatKey);
    if (!rawCatKey || !skillKey) {
      console.error(
        `  ${icon.error} Invalid format: "${rawEntry}". Use "category/key" (e.g. development/git, agents/nextjs) or a category name (e.g. serverless).`,
      );
      continue;
    }

    const cat = registry.categories[catKey];
    if (!cat) {
      console.error(`  ${icon.error} Unknown category: "${rawCatKey}"`);
      console.error(`      Available: ${Object.keys(registry.categories).join(", ")}`);
      continue;
    }

    if (!cat.skills[skillKey]) {
      console.error(`  ${icon.error} Unknown entry: "${skillKey}" in category "${catKey}"`);
      console.error(`      Available: ${Object.keys(cat.skills).join(", ")}`);
      continue;
    }

    const normalizedEntry = `${catKey}/${skillKey}`;

    if (manifest.include.includes(normalizedEntry)) {
      console.log(`  ${icon.skip}  ${normalizedEntry} ${c.dim}(already included)${c.reset}`);
      continue;
    }

    manifest.include.push(normalizedEntry);
    console.log(`  ${icon.add}  ${normalizedEntry}`);
    added++;
  }

  if (added > 0 || refUpdated) {
    saveManifest(manifest);
  }

  if (refUpdated) {
    console.log(`  ${icon.update} Updated manifest ref to ${c.cyan}${latestRef}${c.reset}`);
  }

  if (added > 0) {
    console.log(`\n  ${icon.success} Added ${c.bold}${added}${c.reset} item(s). Run ${c.bold}agent install${c.reset} to download.`);
  }
}
