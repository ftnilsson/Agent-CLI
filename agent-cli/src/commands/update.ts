import { cloneOrUpdate, getLatestRef } from "../git.js";
import { loadManifest, saveManifest } from "../manifest.js";
import { icon, color as c, Spinner } from "../ui.js";

/**
 * `agent update` — Update the ref in .agent.json to the latest tag/commit.
 *
 * Does NOT reinstall automatically; run `agent install` after.
 */
export function cmdUpdate(): void {
  const manifest = loadManifest();

  const spinner = new Spinner(`Fetching latest from ${c.dim}${manifest.source}${c.reset}`);
  spinner.start();
  const repoDir = cloneOrUpdate(manifest.source, "HEAD");
  const latestRef = getLatestRef(repoDir);
  spinner.stop(`Fetched latest`);

  if (latestRef === manifest.ref) {
    console.log(`  ${icon.success} Already up-to-date ${c.dim}(${manifest.ref})${c.reset}`);
    return;
  }

  const oldRef = manifest.ref;
  manifest.ref = latestRef;
  saveManifest(manifest);
  console.log(`  ${icon.update} Updated ref: ${c.dim}${oldRef}${c.reset} ${icon.arrow} ${c.cyan}${latestRef}${c.reset}`);
  console.log(`  ${icon.arrow} Run ${c.bold}agent install${c.reset} to apply the update.`);
}
