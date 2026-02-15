# agent-cli

```
   ╔═══════════════════════════════════════════════════╗
   ║                                                   ║
   ║     █████╗  ██████╗ ███████╗███╗   ██╗████████╗   ║
   ║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝   ║
   ║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║      ║
   ║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║      ║
   ║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║      ║
   ║    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝      ║
   ║                    ┌─┐┬  ┬                        ║
   ║                    │  │  │                        ║
   ║                    └─┘┴─┘┴                        ║
   ║                                                   ║
   ╚═══════════════════════════════════════════════════╝
```

A CLI tool for pulling agent skills and AI coding instructions from a central repository into any project. Pick only the skills and agent instructions you need — compose them into a single agent.md (or tool-specific format) with one command.

## Prerequisites

- **Node.js** ≥ 18
- **Git** installed and available on your `PATH`

## Installation

### From source (this repo)

```bash
cd agent-cli
npm install
npm run build
npm link        # makes the "agent" command available globally
```

### Or run directly without installing

```bash
cd agent-cli
npm install
npm run build
node dist/index.js <command>
```

## Quick Start

```bash
# 1. Create a .agent.json manifest (interactive mode)
agent init github:your-org/Agents --interactive

# 2. Or use presets for quick setup
agent init github:your-org/Agents
agent preset nextjs
agent install

# 3. Output for your preferred AI tool
agent install --format copilot    # → .github/copilot-instructions.md
agent install --format cursor     # → .cursorrules
agent install --format claude     # → CLAUDE.md
```

## Commands

### `agent init <source>`

Create a `.agent.json` manifest in the current directory.

```bash
agent init github:your-org/Agents
agent init github:your-org/Agents --output .agent-skills   # custom output dir
agent init github:your-org/Agents --interactive             # browse & select
agent init github:your-org/Agents -i                        # shorthand
```

| Option | Default | Description |
|---|---|---|
| `--output <dir>` | `.agent` | Directory where skills will be installed |
| `-i, --interactive` | — | Browse and select entries interactively |

### `agent install`

Read `.agent.json` and install everything:
- **Skills** → copied into the output directory
- **Agent instructions** → composed into a single file
- **Local overrides** → automatically appended from `local-instructions.md`

```bash
agent install
agent install --format copilot     # output to .github/copilot-instructions.md
agent install --format cursor      # output to .cursorrules
agent install --format claude      # output to CLAUDE.md
agent install --no-gitignore       # skip adding generated files to .gitignore
```

| Option | Description |
|---|---|
| `--format <target>` | Agent output format — `copilot`, `cursor`, `claude` (default: `agent.md`) |
| `--no-gitignore` | Skip auto-adding generated files to `.gitignore` |

By default, the CLI checks that generated files are listed in `.gitignore` and adds them automatically. Use `--no-gitignore` to opt out.

### `agent list`

Show which skills and agents are in your manifest.

```bash
agent list            # show included entries
agent list --remote   # show ALL available entries in the registry
```

Remote listing marks included entries with `●` and available ones with `○`.

### `agent update`

Fetch the latest ref (tag or commit) from the source repo and update `.agent.json`.

```bash
agent update           # updates the ref
agent install          # then re-install to apply
```

### `agent add <category/key>`

Add one or more skills or agent instructions to your manifest.

```bash
agent add development/git
agent add development/architecture agents/nextjs    # multiple at once
agent add game-dev/*                                # entire category
agent add agents/*                                  # all agent instructions
```

Validates against the remote registry — typos are caught immediately.

### `agent remove <category/key>`

Remove entries from your manifest.

```bash
agent remove development/git
agent remove game-dev/*       # remove entire category
agent remove agents/*         # remove all agent instructions
```

### `agent preset <name>`

Apply a named preset — a curated set of skills and agent instructions for a specific stack.

```bash
agent preset --list            # show available presets
agent preset nextjs            # apply the Next.js preset
agent preset nestjs            # apply the NestJS preset
agent preset react             # apply the React SPA preset
agent preset unity-full        # apply the Unity game dev preset
```

### `agent diff`

Preview what would change on the next `agent install` — like `terraform plan` for your AI instructions.

```bash
agent diff
agent diff --format copilot
```

Output markers:
- `+` — new (will be added)
- `~` — modified (will be updated)
- `=` — unchanged (no action)
- `-` — removed (will be deleted)

### `agent create <agent|skill>`

Scaffold a new agent.md or skill.md from a template.

```bash
agent create agent                   # creates agent.md template
agent create agent my-instructions   # creates my-instructions template
agent create skill                   # creates my-skill/skill.md template
agent create skill api-patterns      # creates api-patterns/skill.md template
```

### `agent prompt <list|show|copy>`

Browse, preview, and copy curated prompts that match your selected categories. Prompts are also installed as files during `agent install`.

```bash
agent prompt list              # show prompts for your included categories
agent prompt list --all        # show all available prompts
agent prompt show dev/code-review    # display a prompt in the terminal
agent prompt copy dev/code-review    # copy a prompt to your clipboard
```

| Subcommand | Description |
|---|---|
| `list` | Show prompts for categories in your manifest |
| `list --all` | Show all prompts in the registry |
| `show <key>` | Print a prompt's content to the terminal |
| `copy <key>` | Copy a prompt to the clipboard |

Keys use `category/prompt` format — e.g. `development/code-review`, `backend/api-review`, `frontend/accessibility-audit`.

During `agent install`, prompts are automatically copied into your output directory under `prompts/<category>/`.

### `agent completions <shell>`

Output shell completion scripts for tab-completion support.

```bash
# Zsh
agent completions zsh > ~/.zsh/completions/_agent

# Bash
agent completions bash >> ~/.bashrc

# Fish
agent completions fish > ~/.config/fish/completions/agent.fish
```

## Local Overrides

Create a `local-instructions.md` file in your project root to add project-specific rules that are automatically appended to the composed agent.md during `agent install`.

This lets you layer project-specific instructions on top of curated base instructions — without forking the source repository.

```markdown
<!-- local-instructions.md -->
# Project-Specific Rules

- Use pnpm instead of npm
- All API responses must follow the JSON:API spec
- Database migrations must be backward-compatible
```

## Manifest Format (`.agent.json`)

```json
{
  "source": "github:your-org/Agents",
  "ref": "v1.0.0",
  "outputDir": ".agent",
  "include": [
    "development/architecture",
    "development/git",
    "agents/nextjs",
    "agents/typescript"
  ],
  "agentOutput": "agent.md"
}
```

| Field | Description |
|---|---|
| `source` | Repository reference — `github:owner/repo` or a full git URL |
| `ref` | Git ref to pin to (tag, branch, or SHA) |
| `outputDir` | Local directory where skills are copied |
| `include` | Array of `category/key` entries to install |
| `agentOutput` | Default output path for composed agent instructions |

## Registry Format (`registry.json`)

The source repository must have a `registry.json` at its root:

```json
{
  "version": "1.0.0",
  "categories": {
    "agents": {
      "name": "Agent Instructions",
      "description": "AI coding agent instruction sets.",
      "path": "agents/instructions",
      "type": "agent",
      "skills": {
        "nextjs": "nextjs-fullstack",
        "typescript": "typescript-general"
      }
    },
    "development": {
      "name": "Development",
      "description": "Universal software development skills.",
      "path": "development/skills",
      "type": "skill",
      "skills": {
        "architecture": "01-architecture-and-system-design",
        "git": "02-version-control-and-git"
      }
    }
  },
  "presets": {
    "nextjs": ["development/*", "agents/nextjs", "agents/typescript"]
  }
}
```

Categories with `"type": "agent"` are composed into the agent instructions file; categories with `"type": "skill"` (or no type) are copied as individual files.

## How It Works

1. **`init`** clones the source repo, resolves the latest ref, and writes `.agent.json`
2. **`add`/`remove`** validate against `registry.json` and update the manifest
3. **`install`** checks out the pinned ref, resolves each key to a folder path, copies skills, composes agent instructions, appends local overrides, and guards `.gitignore`
4. **`update`** fetches the latest tag (or commit SHA) and updates the manifest ref
5. **`diff`** compares what would be installed versus what's currently on disk

The source repo is cached at `~/.cache/agent-cli/` so subsequent operations are fast and work offline after the initial clone.

## Development

```bash
cd agent-cli
npm install

# Run in dev mode (no build step)
npx tsx src/index.ts --help

# Build
npm run build

# Run built version
node dist/index.js --help
```
