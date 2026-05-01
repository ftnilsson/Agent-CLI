// ─── Lockfile (.agent.lock) ───────────────────────────────────────────────────
//
// The lockfile records the SHA-256 hash of each installed item's **source**
// content at the time of the last `agent install`, along with the git ref used.
//
// Layout:
//   {
//     "version": "1",
//     "files": {
//       "development/git": { "hash": "<sha256>", "ref": "v1.2.0" },
//       "agents/nextjs":   { "hash": "<sha256>", "ref": "v1.2.0" }
//     }
//   }
//
// Keys are the `category/key` entries from the manifest include list.
// Hash is a deterministic SHA-256 of the source content:
//   - single file: SHA-256 of the file buffer
//   - directory:   SHA-256 of sorted "relpath\0content" chunks concatenated

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export const LOCK_FILE = ".agent.lock";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LockEntry {
  /** SHA-256 hex digest of the source content at install time. */
  hash: string;
  /** Git ref used during the install that produced this entry. */
  ref: string;
}

export interface LockFile {
  version: "1";
  /** key = manifest include key, e.g. "development/git" */
  files: Record<string, LockEntry>;
}

// ─── I/O ─────────────────────────────────────────────────────────────────────

export function loadLock(cwd: string = process.cwd()): LockFile | null {
  const lockPath = path.join(cwd, LOCK_FILE);
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf-8")) as LockFile;
  } catch {
    return null;
  }
}

export function saveLock(lock: LockFile, cwd: string = process.cwd()): void {
  const lockPath = path.join(cwd, LOCK_FILE);
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

/**
 * Compute a deterministic SHA-256 hex digest for a file or directory.
 *
 * For a directory: collects all files recursively, sorts by relative path, and
 * hashes the concatenation of "<relpath>\0<content>" chunks. This produces the
 * same hash regardless of filesystem order or OS.
 */
export function hashPath(targetPath: string): string {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return hashBuffer(fs.readFileSync(targetPath));
  }

  // Directory: collect all files sorted by relative path
  const chunks: Buffer[] = [];
  for (const relPath of collectFiles(targetPath).sort()) {
    const absPath = path.join(targetPath, relPath);
    const relBuf = Buffer.from(relPath + "\0", "utf-8");
    chunks.push(relBuf, fs.readFileSync(absPath));
  }

  return hashBuffer(Buffer.concat(chunks));
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function hashBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Recursively list all file paths relative to `dir`. */
function collectFiles(dir: string, rel = ""): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFiles(path.join(dir, entry.name), relPath));
    } else {
      results.push(relPath);
    }
  }
  return results;
}
