import { test } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const cliPath = path.resolve(process.cwd(), "dist/main.js");

async function withTempDir(callback: TempDirCallback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cppkg-cache-test-"));

  try {
    await callback(tempDir);
  } finally {
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}

function runCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

test("cache list and clean manage downloaded archive files", async () => {
  await withTempDir(async (cwd) => {
    const cachePath = path.join(cwd, "cpp_libs", "cache");

    await fs.mkdir(cachePath, { recursive: true });
    await fs.writeFile(path.join(cachePath, "abc123-sdk.zip"), "archive", "utf8");

    const listed = runCli(["cache", "list"], cwd);

    assert.equal(listed.status, 0);
    assert.match(listed.stdout, /abc123-sdk\.zip/);
    assert.match(listed.stdout, /7 B/);

    const cleaned = runCli(["cache", "clean"], cwd);

    assert.equal(cleaned.status, 0);
    assert.match(cleaned.stdout, /Removed 1 cached archive/);
    await assert.rejects(
      () => fs.access(path.join(cachePath, "abc123-sdk.zip")),
      /ENOENT/,
    );
  });
});
