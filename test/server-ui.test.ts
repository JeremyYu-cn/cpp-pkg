import { test } from "vitest";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const originalCwd = process.cwd();

function clearDistCache() {
  for (const cachePath of Object.keys(require.cache)) {
    if (cachePath.includes(`${path.sep}dist${path.sep}`)) {
      delete require.cache[cachePath];
    }
  }
}

async function withTempDir(callback: TempDirCallback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cppkg-ui-test-"));

  process.chdir(tempDir);

  try {
    await fs.writeFile(
      path.join(tempDir, "cppkg.json"),
      JSON.stringify({ dependencies: {} }, null, 2) + "\n",
      "utf8",
    );
    await callback(tempDir);
  } finally {
    process.chdir(originalCwd);
    clearDistCache();
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}

function httpGet(urlPath: string, host: string, port: number): Promise<{
  body: string;
  headers: Record<string, string>;
  statusCode: number;
}> {
  return new Promise((resolve, reject) => {
    http.get(
      { host, path: urlPath, port },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          resolve({ body, headers: res.headers as Record<string, string>, statusCode: res.statusCode ?? 0 });
        });
      },
    ).on("error", reject);
  });
}

test("built server UI static file dist/server-ui/index.html exists", async () => {
  const indexPath = path.resolve(process.cwd(), "dist/server-ui/index.html");

  try {
    await fs.access(indexPath);
  } catch {
    assert.fail(`Expected static file at ${indexPath} to exist`);
  }

  const content = await fs.readFile(indexPath, "utf8");
  assert.ok(content.length > 0);
  assert.match(content, /html/i);
});

test("static file serving returns the index.html page", async () => {
  await withTempDir(async () => {
    clearDistCache();
    const { startPackageServer } = require("../dist/tools/server/index.js");

    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);
    assert.match(response.body, /html/i);

    await server.close();
  });
});

test("static file serving returns index.html for non-existent paths", async () => {
  await withTempDir(async () => {
    clearDistCache();
    const { startPackageServer } = require("../dist/tools/server/index.js");

    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/non-existent-page", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);

    await server.close();
  });
});

test("static file serving uses no-store cache control", async () => {
  await withTempDir(async () => {
    clearDistCache();
    const { startPackageServer } = require("../dist/tools/server/index.js");

    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");

    await server.close();
  });
});

test("static file returns index.html for paths outside known files", async () => {
  await withTempDir(async () => {
    clearDistCache();
    const { startPackageServer } = require("../dist/tools/server/index.js");

    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/some-random-path-that-does-not-exist", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /text\/html/);

    await server.close();
  });
});
