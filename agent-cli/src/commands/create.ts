import * as fs from "node:fs";
import * as path from "node:path";
import { LOCAL_INSTRUCTIONS_FILE } from "../constants.js";
import { icon, color as c } from "../ui.js";

const AGENT_TEMPLATE = `# Project Agent Instructions

## Role

You are a [senior/expert] [your role] working on [project name]. You write [key quality attributes] code.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| | | |

## Project Structure

\`\`\`
src/
  ...
\`\`\`

## Code Conventions

### Naming

| Construct | Convention | Example |
|-----------|-----------|---------|
| | | |

### Patterns

- Describe the patterns to follow for this project.
- Be specific — the agent will follow these literally.

## Workflow Rules

- How should the agent approach tasks?
- What should it do before writing code?
- What testing strategy should it follow?

## Anti-Patterns — Never Do These

- Never [specific thing to avoid].
- Never [another thing to avoid].
`;

const SKILL_TEMPLATE = `# Skill Name

## Description

What does this skill teach? What problem does it solve? Keep this to 2-3 sentences.

## When To Use

- Bullet list of situations where this skill applies.
- Be specific about triggers.

## Prerequisites

| Skill | Why |
|-------|-----|
| | |

## Instructions

### 1 — First Section

Teach the first concept. Include code examples where appropriate.

\`\`\`
// Example code
\`\`\`

### 2 — Second Section

Continue building on the concept.

| Approach | Pros | Cons |
|----------|------|------|
| | | |

### 3 — Common Mistakes

What goes wrong and how to avoid it.

## Checklist

- [ ] Did you apply the principle from section 1?
- [ ] Did you avoid the common mistakes from section 3?
`;

/**
 * `agent create <type>` — Scaffold a new agent.md or skill.md template.
 */
export function cmdCreate(args: string[]): void {
  const type = args[0];
  if (!type || !["agent", "skill"].includes(type)) {
    console.error("Usage: agent create <agent|skill>");
    console.error("  e.g. agent create agent     → scaffold agent.md template");
    console.error("  e.g. agent create skill     → scaffold skill.md template");
    process.exit(1);
  }

  const outputArg = args[1];

  if (type === "agent") {
    const fileName = outputArg ?? "agent.md";
    if (fs.existsSync(fileName)) {
      console.error(`  ${icon.error} File already exists: ${fileName}`);
      process.exit(1);
    }
    fs.writeFileSync(fileName, AGENT_TEMPLATE);
    console.log(`  ${icon.scaffold} Created ${c.bold}${fileName}${c.reset} — edit with your project-specific instructions.`);
    console.log(`\n  ${c.dim}Tip: To use as local overrides, rename to ${LOCAL_INSTRUCTIONS_FILE}.${c.reset}`);
    console.log(`  ${c.dim}     Local overrides are automatically appended during agent install.${c.reset}`);
  } else {
    const dirName = outputArg ?? "my-skill";
    const skillPath = path.join(dirName, "skill.md");
    if (fs.existsSync(skillPath)) {
      console.error(`  ${icon.error} File already exists: ${skillPath}`);
      process.exit(1);
    }
    fs.mkdirSync(dirName, { recursive: true });
    fs.writeFileSync(skillPath, SKILL_TEMPLATE);
    console.log(`  ${icon.scaffold} Created ${c.bold}${skillPath}${c.reset} — edit with your skill content.`);
    console.log(`\n  ${c.dim}To add to the registry, update registry.json with a reference to this folder.${c.reset}`);
  }
}
