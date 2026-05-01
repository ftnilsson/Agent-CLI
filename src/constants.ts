import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const { version } = _require("./package.json") as { version: string };
export const VERSION = version;
export const MANIFEST_FILE = ".agent.json";
export const LOCK_FILE = ".agent.lock";
export const LOCAL_INSTRUCTIONS_FILE = "local-instructions.md";
export const SCHEMA_URL =
  "https://raw.githubusercontent.com/ftnilsson/agent-cli/main/schema/agent-manifest.schema.json";
