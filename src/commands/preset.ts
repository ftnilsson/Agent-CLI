import { cloneOrUpdate, loadRegistry, getLatestRef } from "../git.js";
import { loadManifest, saveManifest } from "../manifest.js";
import { icon, color as c } from "../ui.js";

const categoryAliases: Record<string, string> = {
  aws: "aws-cloud",
  azure: "azure-cloud",
};

function normalizeCategoryKey(categoryKey: string): string {
  return categoryAliases[categoryKey] ?? categoryKey;
}

/**
 * `agent preset <name>` — Apply a named preset from the registry.
 * `agent preset --list`  — Show all available presets.
 */
export function cmdPreset(args: string[]): void {
  if (args.length === 0) {
    console.error(`  ${icon.error} Usage: agent preset <name>`);
    console.error("       agent preset --list");
    process.exit(1);
  }

  const manifest = loadManifest();
  const repoDir = cloneOrUpdate(manifest.source, "HEAD");
  const latestRef = getLatestRef(repoDir);
  const registry = loadRegistry(repoDir);

  let refUpdated = false;
  if (manifest.ref !== latestRef) {
    manifest.ref = latestRef;
    refUpdated = true;
  }

  if (!registry.presets || Object.keys(registry.presets).length === 0) {
    console.error(`  ${icon.error} No presets defined in the registry.`);
    process.exit(1);
  }

  // --list: show available presets
  if (args.includes("--list")) {
    if (refUpdated) {
      saveManifest(manifest);
      console.log(`  ${icon.update} Updated manifest ref to ${c.cyan}${latestRef}${c.reset}`);
    }

    console.log(`\n  ${icon.preset} Available presets  ${c.dim}(${manifest.source} @ ${latestRef})${c.reset}\n`);
    for (const [name, patterns] of Object.entries(registry.presets)) {
      console.log(`    ${icon.star} ${c.bold}${name}${c.reset}`);
      for (const p of patterns) {
        console.log(`      └─ ${c.dim}${p}${c.reset}`);
      }
    }
    console.log();
    return;
  }

  const presetName = args[0];
  const patterns = registry.presets[presetName];

  if (!patterns) {
    console.error(`  ${icon.error} Unknown preset: "${presetName}"`);
    console.error(`  Available: ${Object.keys(registry.presets).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n  ${icon.preset} Applying preset: ${c.bold}${presetName}${c.reset}\n`);

  let added = 0;
  for (const pattern of patterns) {
    if (pattern.endsWith("/*")) {
      const catKey = normalizeCategoryKey(pattern.slice(0, -2));
      const cat = registry.categories[catKey];
      if (!cat) {
        console.warn(`  ${icon.warning} Unknown category in preset: "${pattern.slice(0, -2)}"`);
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
    } else {
      const [rawCatKey, skillKey] = pattern.split("/");
      const catKey = normalizeCategoryKey(rawCatKey);
      const cat = registry.categories[catKey];
      if (!cat || !skillKey || !cat.skills[skillKey]) {
        console.warn(`  ${icon.warning} Unknown entry in preset: "${pattern}"`);
        continue;
      }
      const normalizedEntry = `${catKey}/${skillKey}`;
      if (!manifest.include.includes(normalizedEntry)) {
        manifest.include.push(normalizedEntry);
        console.log(`  ${icon.add}  ${normalizedEntry}`);
        added++;
      }
    }
  }

  if (added > 0 || refUpdated) {
    saveManifest(manifest);
  }

  if (refUpdated) {
    console.log(`  ${icon.update} Updated manifest ref to ${c.cyan}${latestRef}${c.reset}`);
  }

  if (added > 0) {
    console.log(`\n  ${icon.success} Added ${c.bold}${added}${c.reset} item(s) via preset "${presetName}". Run ${c.bold}agent install${c.reset} to download.`);
  } else {
    console.log(`\n  ${icon.info} All entries from preset "${presetName}" are already in your manifest.`);
  }
}
