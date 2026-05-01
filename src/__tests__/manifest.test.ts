import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { loadManifest, saveManifest, manifestExists } from "../manifest.js";

describe("manifest", () => {
  let tmpDir: string;
  let origCwd: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-manifest-"));
    origCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("saveManifest + loadManifest", () => {
    it("round-trips a manifest to disk", () => {
      const manifest = {
        source: "github:user/repo",
        ref: "v1.0.0",
        outputDir: ".agent",
        include: ["dev/git", "agents/nextjs"],
        agentOutput: "agent.md",
      };

      saveManifest(manifest, tmpDir);
      const loaded = loadManifest(tmpDir);

      assert.deepEqual(loaded, manifest);
    });

    it("writes valid JSON with trailing newline", () => {
      saveManifest(
        { source: "github:x/y", ref: "abc", outputDir: ".agent", include: [] },
        tmpDir,
      );

      const raw = fs.readFileSync(path.join(tmpDir, ".agent.json"), "utf-8");
      assert.ok(raw.endsWith("\n"));
      assert.doesNotThrow(() => JSON.parse(raw));
    });

    it("preserves agentOutput field", () => {
      const manifest = {
        source: "github:x/y",
        ref: "abc",
        outputDir: ".out",
        include: [],
        agentOutput: "CLAUDE.md",
      };

      saveManifest(manifest, tmpDir);
      const loaded = loadManifest(tmpDir);
      assert.equal(loaded.agentOutput, "CLAUDE.md");
    });
  });

  describe("manifestExists", () => {
    it("returns false for empty directory", () => {
      assert.equal(manifestExists(tmpDir), false);
    });

    it("returns true when .agent.json exists", () => {
      fs.writeFileSync(path.join(tmpDir, ".agent.json"), "{}");
      assert.equal(manifestExists(tmpDir), true);
    });

    it("returns true when legacy .skills.json exists", () => {
      fs.writeFileSync(path.join(tmpDir, ".skills.json"), "{}");
      assert.equal(manifestExists(tmpDir), true);
    });
  });

  describe("legacy migration", () => {
    it("migrates .skills.json to .agent.json", () => {
      const manifest = {
        source: "github:user/repo",
        ref: "v1.0.0",
        outputDir: ".skills",
        include: ["dev/git"],
      };

      fs.writeFileSync(
        path.join(tmpDir, ".skills.json"),
        JSON.stringify(manifest),
      );

      const loaded = loadManifest(tmpDir);

      assert.deepEqual(loaded.source, manifest.source);
      assert.deepEqual(loaded.include, manifest.include);

      // .agent.json should now exist
      assert.ok(fs.existsSync(path.join(tmpDir, ".agent.json")));
      // .skills.json should be deleted
      assert.ok(!fs.existsSync(path.join(tmpDir, ".skills.json")));
    });
  });
});
