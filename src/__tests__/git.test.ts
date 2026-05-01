import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";

import { sourceToUrl, loadRegistry, copyDir, getLatestRef } from "../git.js";

// ─── Detect git ───────────────────────────────────────────────────────────────
// Git may be installed but not on PATH (e.g. GitHub Desktop on Windows).
// If found at a known location, add it to PATH so internal git calls work too.

function detectAndPatchGit(): boolean {
  // Already on PATH
  try {
    execSync("git --version", { stdio: "pipe" });
    return true;
  } catch {}

  // Common Windows installs
  const candidates = [
    "C:\\Program Files\\Git\\bin",
    "C:\\Program Files\\Git\\cmd",
  ];
  for (const dir of candidates) {
    try {
      execSync(`"${dir}\\git.exe" --version`, { stdio: "pipe" });
      // Patch PATH so subsequent bare "git" calls resolve correctly
      process.env.PATH = `${dir};${process.env.PATH ?? ""}`;
      return true;
    } catch {}
  }
  return false;
}

const GIT_AVAILABLE = detectAndPatchGit();
const skipIfNoGit = GIT_AVAILABLE ? false : "git not found in PATH or common locations";

// ─── sourceToUrl ──────────────────────────────────────────────────────────────

describe("sourceToUrl", () => {
  it("converts github: prefix to HTTPS URL", () => {
    assert.equal(
      sourceToUrl("github:ftnilsson/agent-cli"),
      "https://github.com/ftnilsson/agent-cli.git",
    );
  });

  it("passes through a full HTTPS URL unchanged", () => {
    const url = "https://example.com/repo.git";
    assert.equal(sourceToUrl(url), url);
  });

  it("passes through an SSH URL unchanged", () => {
    const url = "git@github.com:user/repo.git";
    assert.equal(sourceToUrl(url), url);
  });

  it("throws for an unsupported source format", () => {
    assert.throws(
      () => sourceToUrl("bitbucket:user/repo"),
      /Unsupported source format/,
    );
  });
});

// ─── loadRegistry ─────────────────────────────────────────────────────────────

describe("loadRegistry", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-registry-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("parses a valid registry.json", () => {
    const registry = {
      version: "1",
      categories: {
        development: {
          name: "Development",
          description: "Dev skills",
          path: "development",
          skills: { git: "git" },
        },
      },
    };
    fs.writeFileSync(
      path.join(tmpDir, "registry.json"),
      JSON.stringify(registry),
    );

    const loaded = loadRegistry(tmpDir);

    assert.equal(loaded.version, "1");
    assert.ok("development" in loaded.categories);
    assert.equal(loaded.categories.development.name, "Development");
  });

  it("throws when registry.json is missing", () => {
    assert.throws(() => loadRegistry(tmpDir), /registry\.json not found/);
  });
});

// ─── copyDir ──────────────────────────────────────────────────────────────────

describe("copyDir", () => {
  let srcDir: string;
  let destDir: string;

  beforeEach(() => {
    srcDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-copy-src-"));
    destDir = path.join(os.tmpdir(), `agent-copy-dest-${Date.now()}`);
  });

  afterEach(() => {
    fs.rmSync(srcDir, { recursive: true, force: true });
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
  });

  it("copies a flat directory", () => {
    fs.writeFileSync(path.join(srcDir, "a.txt"), "hello");
    fs.writeFileSync(path.join(srcDir, "b.txt"), "world");

    copyDir(srcDir, destDir);

    assert.equal(fs.readFileSync(path.join(destDir, "a.txt"), "utf-8"), "hello");
    assert.equal(fs.readFileSync(path.join(destDir, "b.txt"), "utf-8"), "world");
  });

  it("copies nested directories recursively", () => {
    const sub = path.join(srcDir, "sub");
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, "nested.txt"), "nested");

    copyDir(srcDir, destDir);

    assert.equal(
      fs.readFileSync(path.join(destDir, "sub", "nested.txt"), "utf-8"),
      "nested",
    );
  });

  it("creates the destination directory when absent", () => {
    fs.writeFileSync(path.join(srcDir, "file.txt"), "data");
    assert.ok(!fs.existsSync(destDir));
    copyDir(srcDir, destDir);
    assert.ok(fs.existsSync(destDir));
  });
});

// ─── getLatestRef ─────────────────────────────────────────────────────────────

describe("getLatestRef", () => {
  let repoDir: string;

  beforeEach(() => {
    if (!GIT_AVAILABLE) return;
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-git-ref-"));

    const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    };
    const run = (cmd: string) =>
      execSync(cmd, { cwd: repoDir, stdio: "pipe", env: gitEnv });

    run("git init");
    run('git config user.email "test@example.com"');
    run('git config user.name "Test"');
    run("git config commit.gpgsign false");
    run("git config tag.gpgSign false");
    fs.writeFileSync(path.join(repoDir, "README.md"), "hello");
    run("git add .");
    run('git commit -m "init"');
  });

  afterEach(() => {
    if (repoDir && fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("returns a short SHA when no tags exist", { skip: skipIfNoGit }, () => {
    const ref = getLatestRef(repoDir);
    assert.match(ref, /^[0-9a-f]{4,}$/);
  });

  it("returns the tag name when a tag exists", { skip: skipIfNoGit }, () => {
    execSync("git tag v1.2.3", { cwd: repoDir, stdio: "pipe" });
    const ref = getLatestRef(repoDir);
    assert.equal(ref, "v1.2.3");
  });
});
