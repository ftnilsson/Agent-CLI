// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentManifest {
  /** Source repository, e.g. "github:user/repo" */
  source: string;
  /** Git ref: tag, branch, or SHA */
  ref: string;
  /** Where to place the downloaded skills */
  outputDir: string;
  /** List of "category/skill-key" references to include */
  include: string[];
  /** Output path for composed agent instruction files (default: "agent.md") */
  agentOutput?: string;
}

/** @deprecated Use AgentManifest instead */
export type SkillsManifest = AgentManifest;

export type CategoryType = "skill" | "agent";

export interface RegistryCategory {
  name: string;
  description: string;
  /** Relative path within the source repo to the content folder */
  path: string;
  /** Content type: "skill" (default) installs into outputDir, "agent" composes into agent.md */
  type?: CategoryType;
  /** Map of short key → folder name */
  skills: Record<string, string>;
  /** Relative path within the source repo to the prompts folder (optional) */
  promptsPath?: string;
  /** Map of short key → prompt filename (optional) */
  prompts?: Record<string, string>;
}

export interface Registry {
  version: string;
  /** Named bundles of category globs, e.g. "fullstack": ["development/*", "frontend/*", "backend/*"] */
  presets?: Record<string, string[]>;
  categories: Record<string, RegistryCategory>;
}
