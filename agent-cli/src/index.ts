#!/usr/bin/env node

import { printLogo, icon, color as c } from "./ui.js";
import { VERSION, MANIFEST_FILE, LOCAL_INSTRUCTIONS_FILE } from "./constants.js";
import { cmdInit } from "./commands/init.js";
import { cmdInstall } from "./commands/install.js";
import { cmdList } from "./commands/list.js";
import { cmdUpdate } from "./commands/update.js";
import { cmdAdd } from "./commands/add.js";
import { cmdRemove } from "./commands/remove.js";
import { cmdPreset } from "./commands/preset.js";
import { cmdDiff } from "./commands/diff.js";
import { cmdCreate } from "./commands/create.js";
import { cmdPrompt } from "./commands/prompt.js";
import { cmdCompletions } from "./commands/completions.js";
import { cmdDevContainer } from "./commands/dev-container.js";
import { cmdSearch } from "./commands/search.js";

// â”€â”€â”€ CLI entry point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "init":
    runAsync(cmdInit(args));
    break;
  case "install":
    cmdInstall(args);
    break;
  case "list":
    cmdList(args);
    break;
  case "update":
    cmdUpdate();
    break;
  case "add":
    cmdAdd(args);
    break;
  case "remove":
    cmdRemove(args);
    break;
  case "preset":
    cmdPreset(args);
    break;
  case "diff":
    cmdDiff(args);
    break;
  case "create":
    cmdCreate(args);
    break;
  case "prompt":
    cmdPrompt(args);
    break;
  case "search":
    cmdSearch(args);
    break;
  case "completions":
    cmdCompletions(args);
    break;
  case "dev-container":
    cmdDevContainer(args);
    break;
  case "--version":
  case "-v":
    console.log(`\n  ${icon.agent} ${c.bold}agent-cli${c.reset} ${c.dim}v${VERSION}${c.reset}\n`);
    break;
  case "--help":
  case "-h":
  case undefined:
    printLogo();
    printHelp();
    break;
  default:
    console.error(`Unknown command: "${command}"\n`);
    printHelp();
    process.exit(1);
}

/** Wrap async commands so unhandled rejections show a clean error. */
function runAsync(p: Promise<void>): void {
  p.catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}


/**
 * Print CLI help text.
 */
function printHelp(): void {
  console.log(`
  ${c.dim}v${VERSION}${c.reset}  ${c.dim}â”€${c.reset} Pull agent skills and instructions from a central repository.

  ${c.bold}USAGE${c.reset}
    ${c.cyan}agent${c.reset} <command> [options]

  ${c.bold}COMMANDS${c.reset}
    ${icon.init}  ${c.cyan}init${c.reset} [source]              Create a ${MANIFEST_FILE} manifest
        --output <dir>           Output directory for skills ${c.dim}(default: .agent)${c.reset}
        -i, --interactive        Browse and select entries interactively
        ${c.dim}(defaults to github:ftnilsson/agent-cli)${c.reset}

    ${icon.install}  ${c.cyan}install${c.reset}                    Pull skills + compose agent instructions
        --target <target>        Install target (default: copilot):
                                   copilot  ${icon.arrow} .github/copilot-instructions.md + .github/
                                   claude   ${icon.arrow} CLAUDE.md + .claude/
                                   cursor   ${icon.arrow} .cursorrules + .cursor/
        --skip-gitignore         Skip auto-adding generated files to .gitignore

    ${icon.list}  ${c.cyan}list${c.reset}                       Show entries in your manifest
        --remote                 Show all available entries from the registry

    ${icon.update}  ${c.cyan}update${c.reset}                     Update the ref to the latest tag/commit

    ${icon.add}  ${c.cyan}add${c.reset} <category/key>         Add skill(s) or agent instruction(s)
        e.g. agent add development/git agents/nextjs
        e.g. agent add game-dev/*          ${c.dim}(add entire category)${c.reset}
        e.g. agent add agents/*            ${c.dim}(add all agent instructions)${c.reset}
        ${c.dim}Category aliases: aws->aws-cloud, azure->azure-cloud${c.reset}

    ${icon.remove}  ${c.cyan}remove${c.reset} <category/key>      Remove entries from the manifest
        e.g. agent remove development/git
        e.g. agent remove agents/*         ${c.dim}(remove all agent instructions)${c.reset}

    ${icon.preset}  ${c.cyan}preset${c.reset} <name>              Apply a named preset (adds skills + agents)
        --list                   Show available presets
        e.g. agent preset nextjs
        e.g. agent preset --list

    ${icon.diff}  ${c.cyan}diff${c.reset}                       Preview what would change on next install
        --target <target>        Install target (copilot, claude, cursor)

    ${icon.scaffold}  ${c.cyan}create${c.reset} <agent|skill>       Scaffold a new agent.md or skill.md template
        e.g. agent create agent
        e.g. agent create skill my-skill

    ${icon.prompt}  ${c.cyan}prompt${c.reset} <list|show|copy>    Browse and use prompts
        list                     Show prompts for your categories
        list --all               Show all available prompts
        show <key>               Display a prompt in the terminal
        copy <key>               Copy a prompt to the clipboard
        e.g. agent prompt show development/code-review

    ${icon.search}  ${c.cyan}search${c.reset} <query>            Find skills, agents, and prompts by keyword
        --json                   Output results as JSON
        e.g. agent search auth
        e.g. agent search typescript --json

    ${c.cyan}completions${c.reset} <shell>        Output shell completion script
        e.g. agent completions zsh > ~/.zsh/completions/_agent

    ${icon.container}  ${c.cyan}dev-container${c.reset}              Scaffold a .devcontainer/ setup
        --target <target>        Dev container target (required):
                                   claude   ${icon.arrow} Claude Code dev container
                                   copilot  ${icon.arrow} GitHub Copilot dev container
                                   ai       ${icon.arrow} Multi-agent dev container (Claude Code + tools)

  ${c.bold}OPTIONS${c.reset}
    -v, --version              Show version
    -h, --help                 Show this help

  ${c.bold}LOCAL OVERRIDES${c.reset}
    Create a ${c.cyan}${LOCAL_INSTRUCTIONS_FILE}${c.reset} file in your project root.
    Its contents are automatically appended to the composed instruction file
    during ${c.cyan}agent install${c.reset}.

  ${c.bold}EXAMPLES${c.reset}
    ${c.dim}# Quick start with default repository${c.reset}
    ${c.cyan}agent init --interactive${c.reset}

    ${c.dim}# Or use a custom repository${c.reset}
    ${c.cyan}agent init github:your-org/agents${c.reset}
    ${c.cyan}agent preset nextjs${c.reset}
    ${c.cyan}agent install${c.reset}

    ${c.dim}# Preview changes before installing${c.reset}
    ${c.cyan}agent diff${c.reset}

    ${c.dim}# Install to specific targets${c.reset}
    ${c.cyan}agent install --target copilot${c.reset}
    ${c.cyan}agent install --target cursor${c.reset}
    ${c.cyan}agent install --target claude${c.reset}

    ${c.dim}# Scaffold templates${c.reset}
    ${c.cyan}agent create agent${c.reset}
    ${c.cyan}agent create skill my-new-skill${c.reset}

    ${c.dim}# Browse and use prompts${c.reset}
    ${c.cyan}agent prompt list${c.reset}
    ${c.cyan}agent prompt show development/code-review${c.reset}
    ${c.cyan}agent prompt copy frontend/accessibility-audit${c.reset}

    ${c.dim}# Install shell completions${c.reset}
    ${c.cyan}agent completions zsh > ~/.zsh/completions/_agent${c.reset}

    ${c.dim}# Scaffold a dev container${c.reset}
    ${c.cyan}agent dev-container --target claude${c.reset}
    ${c.cyan}agent dev-container --target ai${c.reset}
`);
}
