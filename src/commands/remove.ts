import { loadManifest, saveManifest } from "../manifest.js";
import { icon, color as c } from "../ui.js";

/**
 * `agent remove <category/key> [...]` — Remove entries from the manifest.
 */
export function cmdRemove(args: string[]): void {
  if (args.length === 0) {
    console.error("Usage: agent remove <category/key> [<category/key> ...]");
    process.exit(1);
  }

  const manifest = loadManifest();
  let removed = 0;

  for (const entry of args) {
    // Support removing a whole category with "category/*"
    if (entry.endsWith("/*")) {
      const catKey = entry.slice(0, -2);
      const before = manifest.include.length;
      manifest.include = manifest.include.filter((i) => !i.startsWith(`${catKey}/`));
      const count = before - manifest.include.length;
      if (count > 0) {
        console.log(`  ${icon.remove} Removed ${count} item(s) from ${catKey}`);
        removed += count;
      } else {
        console.log(`  ${icon.skip}  No entries from "${catKey}" in manifest`);
      }
      continue;
    }

    const idx = manifest.include.indexOf(entry);
    if (idx === -1) {
      console.log(`  ${icon.skip}  ${entry} ${c.dim}(not in manifest)${c.reset}`);
      continue;
    }

    manifest.include.splice(idx, 1);
    console.log(`  ${icon.remove} ${entry}`);
    removed++;
  }

  if (removed > 0) {
    saveManifest(manifest);
    console.log(
      `\n  ${icon.success} Removed ${c.bold}${removed}${c.reset} item(s). Run ${c.bold}agent install${c.reset} to clean up.`,
    );
  }
}
