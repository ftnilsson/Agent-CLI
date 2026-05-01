import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { cmdRemove } from "../commands/remove.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function writeManifest(tmpDir: string, include: string[]): void {
  fs.writeFileSync(
    path.join(tmpDir, ".agent.json"),
    JSON.stringify(
      {
        source: "github:ftnilsson/agent-cli",
        ref: "v1.0.0",
        outputDir: ".agent",
        include,
      },
      null,
      2,
    ) + "\n",
  );
}

function readIncludes(tmpDir: string): string[] {
  const raw = fs.readFileSync(path.join(tmpDir, ".agent.json"), "utf-8");
  return (JSON.parse(raw) as { include: string[] }).include;
}

// ─── cmdRemove ────────────────────────────────────────────────────────────────

describe("cmdRemove", () => {
  let tmpDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-remove-"));
    origCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("removes a single entry from the manifest", () => {
    writeManifest(tmpDir, ["development/git", "backend/auth"]);
    cmdRemove(["development/git"]);
    assert.deepEqual(readIncludes(tmpDir), ["backend/auth"]);
  });

  it("removes all entries in a category using category/*", () => {
    writeManifest(tmpDir, [
      "development/git",
      "development/architecture",
      "backend/auth",
    ]);
    cmdRemove(["development/*"]);
    assert.deepEqual(readIncludes(tmpDir), ["backend/auth"]);
  });

  it("is a no-op when the entry is not in the manifest", () => {
    writeManifest(tmpDir, ["backend/auth"]);
    cmdRemove(["development/git"]);
    assert.deepEqual(readIncludes(tmpDir), ["backend/auth"]);
  });

  it("removes multiple entries in a single call", () => {
    writeManifest(tmpDir, [
      "development/git",
      "backend/auth",
      "frontend/react",
    ]);
    cmdRemove(["development/git", "frontend/react"]);
    assert.deepEqual(readIncludes(tmpDir), ["backend/auth"]);
  });

  it("does not modify the file when nothing is removed", () => {
    writeManifest(tmpDir, ["backend/auth"]);
    const before = fs.readFileSync(path.join(tmpDir, ".agent.json"), "utf-8");
    cmdRemove(["development/git"]);
    const after = fs.readFileSync(path.join(tmpDir, ".agent.json"), "utf-8");
    assert.equal(after, before);
  });

  it("removes a category/* glob that partially overlaps the manifest", () => {
    writeManifest(tmpDir, ["development/git", "backend/auth", "backend/db"]);
    cmdRemove(["backend/*"]);
    assert.deepEqual(readIncludes(tmpDir), ["development/git"]);
  });
});
