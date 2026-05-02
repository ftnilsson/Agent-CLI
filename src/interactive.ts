import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { Registry } from "./types.js";
import { icon, color as c } from "./ui.js";

// ─── Interactive prompts (zero dependencies) ─────────────────────────────────

/**
 * Ask the user to select entries from the registry interactively.
 * Returns an array of "category/key" strings.
 */
export async function interactiveSelect(registry: Registry): Promise<string[]> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const selected: string[] = [];

  try {
    console.log(`\n  ${icon.search} Browse and select skills & agent instructions.\n`);
    console.log(`  ${c.dim}For each entry, type [y]es, [n]o, or [a]ll for the category.${c.reset}\n`);

    for (const [catKey, cat] of Object.entries(registry.categories)) {
      const typeIcon = cat.type === "agent" ? icon.agent : icon.skill;
      console.log(`  ${typeIcon} ${c.bold}${cat.name}${c.reset}`);
      console.log(`  ${c.dim}${cat.description}${c.reset}\n`);

      const answer = await rl.question(`  ${icon.question} Add all ${c.cyan}${catKey}/*${c.reset}? ${c.dim}[y/n] (default: n)${c.reset} `);
      if (answer.trim().toLowerCase() === "y") {
        for (const skillKey of Object.keys(cat.skills)) {
          const full = `${catKey}/${skillKey}`;
          selected.push(full);
          console.log(`    ${icon.add}  ${full}`);
        }
        console.log();
        continue;
      }

      // Ask per skill
      for (const [skillKey, folder] of Object.entries(cat.skills)) {
        const full = `${catKey}/${skillKey}`;
        const answer = await rl.question(`    ${icon.pick} ${full}  ${c.dim}(${folder})${c.reset}  [y/n] `);
        if (answer.trim().toLowerCase() === "y") {
          selected.push(full);
          console.log(`      ${icon.add}  ${full}`);
        }
      }
      console.log();
    }
  } finally {
    rl.close();
  }

  if (selected.length > 0) {
    console.log(`  ${icon.done} Selected ${c.bold}${selected.length}${c.reset} item(s)!\n`);
  }

  return selected;
}
