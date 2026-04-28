import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { loadLock, saveLock, hashPath, type LockFile } from "../lock.js";

// ─── loadLock ─────────────────────────────────────────────────────────────────

describe("loadLock", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-loadlock-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when .agent.lock does not exist", () => {
    assert.equal(loadLock(tmpDir), null);
  });

  it("parses a valid lock file", () => {
    const lock: LockFile = {
      version: "1",
      files: {
        "development/git": { hash: "abc123", ref: "v1.0.0" },
      },
    };
    fs.writeFileSync(path.join(tmpDir, ".agent.lock"), JSON.stringify(lock));

    const loaded = loadLock(tmpDir);
    assert.deepEqual(loaded, lock);
  });

  it("returns null for malformed JSON", () => {
    fs.writeFileSync(path.join(tmpDir, ".agent.lock"), "not-valid-json{{{");
    assert.equal(loadLock(tmpDir), null);
  });
});

// ─── saveLock ─────────────────────────────────────────────────────────────────

describe("saveLock", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-savelock-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes a .agent.lock file with trailing newline and valid JSON", () => {
    const lock: LockFile = {
      version: "1",
      files: { "backend/auth": { hash: "def456", ref: "v2.0.0" } },
    };

    saveLock(lock, tmpDir);

    const raw = fs.readFileSync(path.join(tmpDir, ".agent.lock"), "utf-8");
    assert.ok(raw.endsWith("\n"), "should end with a newline");
    assert.doesNotThrow(() => JSON.parse(raw));
  });

  it("round-trips lock data through save + load", () => {
    const lock: LockFile = {
      version: "1",
      files: {
        "development/git": { hash: "aaa111", ref: "v1.0.0" },
        "backend/auth": { hash: "bbb222", ref: "v1.0.0" },
      },
    };

    saveLock(lock, tmpDir);
    const loaded = loadLock(tmpDir);

    assert.deepEqual(loaded, lock);
  });
});

// ─── hashPath ─────────────────────────────────────────────────────────────────

describe("hashPath", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-hash-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("produces a 64-char hex SHA-256 for a file", () => {
    const filePath = path.join(tmpDir, "file.txt");
    fs.writeFileSync(filePath, "hello world");
    assert.match(hashPath(filePath), /^[0-9a-f]{64}$/);
  });

  it("same file content → same hash", () => {
    const a = path.join(tmpDir, "a.txt");
    const b = path.join(tmpDir, "b.txt");
    fs.writeFileSync(a, "same content");
    fs.writeFileSync(b, "same content");
    assert.equal(hashPath(a), hashPath(b));
  });

  it("different file content → different hash", () => {
    const a = path.join(tmpDir, "a.txt");
    const b = path.join(tmpDir, "b.txt");
    fs.writeFileSync(a, "content A");
    fs.writeFileSync(b, "content B");
    assert.notEqual(hashPath(a), hashPath(b));
  });

  it("produces a 64-char hex SHA-256 for a directory", () => {
    const dirPath = path.join(tmpDir, "skill");
    fs.mkdirSync(dirPath);
    fs.writeFileSync(path.join(dirPath, "SKILL.md"), "# My Skill");
    assert.match(hashPath(dirPath), /^[0-9a-f]{64}$/);
  });

  it("directory hash is deterministic regardless of write order", () => {
    const dir1 = path.join(tmpDir, "dir1");
    const dir2 = path.join(tmpDir, "dir2");
    fs.mkdirSync(dir1);
    fs.mkdirSync(dir2);

    fs.writeFileSync(path.join(dir1, "a.txt"), "alpha");
    fs.writeFileSync(path.join(dir1, "b.txt"), "beta");
    // Same files, written in opposite order
    fs.writeFileSync(path.join(dir2, "b.txt"), "beta");
    fs.writeFileSync(path.join(dir2, "a.txt"), "alpha");

    assert.equal(hashPath(dir1), hashPath(dir2));
  });

  it("changing a file in a directory changes its hash", () => {
    const dirPath = path.join(tmpDir, "skill");
    fs.mkdirSync(dirPath);
    fs.writeFileSync(path.join(dirPath, "SKILL.md"), "# Original");
    const before = hashPath(dirPath);

    fs.writeFileSync(path.join(dirPath, "SKILL.md"), "# Modified");
    const after = hashPath(dirPath);

    assert.notEqual(before, after);
  });
});
