import * as fs from "node:fs";
import * as path from "node:path";
import { cloneOrUpdate, copyDir } from "../git.js";
import { loadManifest, manifestExists } from "../manifest.js";
import { icon, color as c, Spinner } from "../ui.js";

const DEV_CONTAINER_TARGETS = ["claude", "copilot", "ai"] as const;
type DevContainerTarget = (typeof DEV_CONTAINER_TARGETS)[number];

/**
 * `agent dev-container` — Scaffold a .devcontainer/ setup in the current directory.
 *
 * Usage:
 *   agent dev-container --target <claude|copilot|ai>
 */
export function cmdDevContainer(args: string[]): void {
  const targetIdx = args.indexOf("--target");
  const target =
    targetIdx !== -1 && args[targetIdx + 1]
      ? (args[targetIdx + 1] as DevContainerTarget)
      : undefined;

  if (!target) {
    console.error(
      `  ${icon.error} Missing required option: --target <${DEV_CONTAINER_TARGETS.join("|")}>\n`,
    );
    console.log(
      `  ${icon.info} Usage: ${c.cyan}agent dev-container --target <target>${c.reset}\n`,
    );
    console.log(
      `  Available targets:\n${DEV_CONTAINER_TARGETS.map((t) => `    ${icon.container} ${c.cyan}${t}${c.reset}`).join("\n")}\n`,
    );
    process.exit(1);
  }

  if (!DEV_CONTAINER_TARGETS.includes(target)) {
    console.error(
      `  ${icon.error} Unknown target: "${target}". Must be one of: ${DEV_CONTAINER_TARGETS.join(", ")}\n`,
    );
    process.exit(1);
  }

  if (!manifestExists()) {
    console.error(`  ${icon.error} No ${c.bold}.agent.json${c.reset} manifest found.\n`);
    console.error(`  Run ${c.cyan}agent init <source>${c.reset} first to set up a registry source.`);
    console.error(`  e.g. ${c.cyan}agent init github:ftnilsson/agent-registry${c.reset}`);
    process.exit(1);
  }
  const source = loadManifest().source;

  const spinner = new Spinner(
    `${icon.container} Fetching dev-container template for ${c.cyan}${target}${c.reset}`,
  );
  spinner.start();

  let repoDir: string;
  try {
    repoDir = cloneOrUpdate(source, "HEAD");
  } catch (err) {
    spinner.fail(`Failed to fetch source: ${(err as Error).message}`);
    process.exit(1);
  }

  const templateSrc = path.join(repoDir, "dev-containers", target);
  const devContainerDest = path.resolve(".devcontainer");

  if (!fs.existsSync(templateSrc)) {
    spinner.fail(
      `Template not found in source repo: dev-containers/${target}`,
    );
    process.exit(1);
  }

  spinner.stop(`Template located ${c.dim}(dev-containers/${target})${c.reset}`);

  // Support both dev-containers/<target>/.devcontainer/* and
  // dev-containers/<target>/* template layouts, preferring the nested
  // .devcontainer directory when present.
  const devContainerSrc = path.join(templateSrc, ".devcontainer");
  const nestedHasFiles =
    fs.existsSync(devContainerSrc) && fs.readdirSync(devContainerSrc).length > 0;
  const rootHasFiles = fs.readdirSync(templateSrc).some(
    (entry) => entry !== ".devcontainer",
  );
  const copySource = nestedHasFiles
    ? devContainerSrc
    : rootHasFiles
      ? templateSrc
      : null;

  if (fs.existsSync(devContainerDest)) {
    console.log(
      `  ${icon.warning} ${c.yellow}.devcontainer/${c.reset} already exists — skipping creation.`,
    );
  } else if (copySource) {
    copyDir(copySource, devContainerDest);
    const files = fs.readdirSync(devContainerDest);
    console.log(
      `\n  ${icon.success} Created ${c.bold}.devcontainer/${c.reset} with ${files.length} file(s):`,
    );
    for (const f of files) {
      console.log(`    ${icon.file} ${f}`);
    }
  } else {
    fs.mkdirSync(devContainerDest, { recursive: true });
    console.log(
      `\n  ${icon.success} Created ${c.bold}.devcontainer/${c.reset} ${c.dim}(empty — add your Dockerfile and devcontainer.json)${c.reset}`,
    );
  }

  console.log(`\n  ${icon.info} Target: ${c.cyan}${target}${c.reset}`);
  console.log(`  ${icon.folder} Output: ${c.dim}.devcontainer/${c.reset}\n`);
}
