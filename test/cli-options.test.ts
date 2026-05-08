import { test } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const packageJson = require("../package.json");

const cliPath = path.resolve(process.cwd(), "dist/main.js");

async function withTempDir(callback: TempDirCallback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cppkg-cli-test-"));

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

test("root version flag follows package.json", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["--version"], cwd);

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), packageJson.version);
  });
});

test("get help exposes version selection options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["get", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /--tag <tag>/);
    assert.match(result.stdout, /--branch <branch>/);
    assert.match(result.stdout, /--version-range <range>/);
    assert.match(result.stdout, /--version-policy <policy>/);
    assert.match(result.stdout, /--prerelease/);
    assert.match(result.stdout, /--no-cache/);
  });
});

test("add help exposes manifest write and install options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["add", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Add one dependency to cppkg\.json/);
    assert.match(result.stdout, /--name <name>/);
    assert.match(result.stdout, /--version-range <range>/);
    assert.match(result.stdout, /--version-policy <policy>/);
    assert.match(result.stdout, /--install/);
    assert.match(result.stdout, /--force/);
  });
});

test("update help exposes version selection options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["update", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /--tag <tag>/);
    assert.match(result.stdout, /--branch <branch>/);
    assert.match(result.stdout, /--version-range <range>/);
    assert.match(result.stdout, /--version-policy <policy>/);
    assert.match(result.stdout, /--prerelease/);
    assert.match(result.stdout, /--no-cache/);
  });
});

test("install help exposes manifest install options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["install", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Install dependencies declared in cppkg\.json/);
    assert.match(result.stdout, /--http-proxy <url>/);
    assert.match(result.stdout, /--https-proxy <url>/);
    assert.match(result.stdout, /--no-cache/);
    assert.match(result.stdout, /--frozen-lockfile/);
  });
});

test("compile help exposes host and Docker compiler options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["compile", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Compile C\/C\+\+ source files/);
    assert.match(result.stdout, /--compiler <command>/);
    assert.match(result.stdout, /--toolchain <name>/);
    assert.match(result.stdout, /--docker/);
    assert.match(result.stdout, /--docker-image <image>/);
    assert.match(result.stdout, /--dry-run/);
  });
});

test("build help exposes CMake and Docker compiler environment options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["build", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Configure and build a CMake project/);
    assert.match(result.stdout, /--build-dir <path>/);
    assert.match(result.stdout, /--toolchain <name>/);
    assert.match(result.stdout, /--docker/);
    assert.match(result.stdout, /--docker-image <image>/);
    assert.match(result.stdout, /--dry-run/);
  });
});

test("compiler help exposes version management subcommands", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["compiler", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Manage compiler versions/);
    assert.match(result.stdout, /list/);
    assert.match(result.stdout, /install/);
    assert.match(result.stdout, /use/);
  });
});

test("inspect help exposes project include inspection command", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["inspect", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Inspect C\/C\+\+ source includes/);
    assert.match(result.stdout, /--add/);
    assert.match(result.stdout, /--install/);
  });
});

test("cache help exposes archive cache subcommands", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["cache", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Manage downloaded archive cache/);
    assert.match(result.stdout, /list/);
    assert.match(result.stdout, /clean/);
  });
});

test("cmake help exposes integration helper generation", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["cmake", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Generate a cppkg\.cmake integration helper/);
    assert.match(result.stdout, /--output <path>/);
    assert.match(result.stdout, /--force/);
  });
});

test("search help exposes result selection options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["search", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Search GitHub for C\/C\+\+ libraries sorted by stars/);
    assert.match(result.stdout, /--limit <number>/);
    assert.match(result.stdout, /--language <language>/);
    assert.match(result.stdout, /--install/);
    assert.match(result.stdout, /--no-interactive/);
    assert.match(result.stdout, /--select <number>/);
  });
});

test("server help exposes web server options", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["server", "--help"], cwd);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Start a local web server/);
    assert.match(result.stdout, /--host <host>/);
    assert.match(result.stdout, /--port <port>/);
    assert.match(result.stdout, /--http-proxy <url>/);
    assert.match(result.stdout, /--https-proxy <url>/);
  });
});

test("get rejects using tag and branch together before network access", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(
      ["get", "https://github.com/owner/repo", "--tag", "v1", "--branch", "main"],
      cwd,
    );

    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /Options --tag and --branch cannot be used together/,
    );
  });
});

test("get rejects tag and branch options for direct archive URLs", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(
      ["get", "https://example.com/sdk.zip", "--tag", "v1"],
      cwd,
    );

    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /Options --tag and --branch can only be used with GitHub or Gitee repository URLs/,
    );
  });
});

test("update rejects explicit version selection without a package selector", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["update", "--tag", "v1"], cwd);

    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /Options --tag and --branch require a package selector/,
    );
  });
});

test("remove reports missing dependency metadata cleanly", async () => {
  await withTempDir(async (cwd) => {
    const result = runCli(["remove", "missing"], cwd);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /No installed packages found/);
  });
});
