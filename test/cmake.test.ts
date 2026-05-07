import { test } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const cliPath = path.resolve(process.cwd(), "dist/main.js");

async function withTempDir(callback: TempDirCallback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cppkg-cmake-test-"));

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

test("cmake command generates cppkg.cmake integration helper", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["cmake"], cwd);
    const content = await fs.readFile(path.join(cwd, "cppkg.cmake"), "utf8");

    assert.equal(result.status, 0);
    assert.match(content, /add_library\(cppkg::headers ALIAS cppkg_headers\)/);
    assert.match(content, /CPPKG_INCLUDE_DIR/);
    assert.match(content, /add_subdirectory/);

    const refused = runCli(["cmake"], cwd);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /cppkg\.cmake already exists/);

    const forced = runCli(["cmake", "--force"], cwd);
    assert.equal(forced.status, 0);
  });
});
