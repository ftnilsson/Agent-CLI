# Agent Instructions

Curated, opinionated agent instruction files for specific tech stacks and project types.

## What are agent instructions?

Agent instructions tell AI coding assistants **who to be** and **what rules to follow** in a given project. Unlike skills (which teach *how to do things*), agent instructions define:

- **Identity & Role** — Clear persona with expertise boundaries
- **Tech Stack** — Exact versions and libraries, not just framework names
- **Project Structure** — Expected folder layout and file conventions
- **Code Conventions** — Naming, patterns, formatting, imports
- **Workflow Rules** — How to approach tasks, testing, error handling
- **Anti-patterns** — Explicit "never do this" list

## Available Instructions

| Key | Stack | Description |
|-----|-------|-------------|
| `agents/nextjs` | Next.js 15 | Full-stack Next.js with App Router, TypeScript, Tailwind |
| `agents/nestjs` | NestJS | API development with NestJS, Prisma, PostgreSQL |
| `agents/react-spa` | React 19 | Single-page apps with Vite, TanStack, TypeScript |
| `agents/unity` | Unity 6 | Game development with Unity and C# |
| `agents/typescript` | TypeScript | Universal TypeScript/Node.js conventions |

## Usage

```bash
# Add agent instructions to your project
agent add agents/nextjs

# Combine with skills
agent add agents/nextjs development/* frontend/*

# Or use a preset that includes both
agent preset nextjs

# Install — agent instructions compose to a target-specific index file, skills go to target-specific folders
agent install

# Target a specific tool
agent install --target copilot    # → .github/copilot-instructions.md + .github/agents/
agent install --target cursor     # → .cursorrules + .cursor/agents/
agent install --target claude     # → CLAUDE.md + .claude/agents/
```

## Composability

Multiple agent instruction files can be combined. For example, adding both `agents/typescript` (general TypeScript rules) and `agents/nextjs` (Next.js-specific rules) produces a single composed instruction index with both sets of instructions.

```bash
agent add agents/typescript agents/nextjs
agent install
# → produces a single composed instruction index with both instruction sets
```
