import { test } from "vitest";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { startPackageServer } = require("../dist/tools/server/index.js");

const originalCwd = process.cwd();

async function withTempDir(callback: TempDirCallback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cppkg-server-test-"));

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
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}

function httpGet(urlPath: string, host: string, port: number): Promise<{
  body: string;
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
          resolve({ body, statusCode: res.statusCode ?? 0 });
        });
      },
    ).on("error", reject);
  });
}

function httpPost(
  urlPath: string,
  host: string,
  port: number,
  payload: unknown,
): Promise<{
  body: string;
  statusCode: number;
}> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      { host, path: urlPath, port, method: "POST", headers: { "content-length": Buffer.byteLength(body), "content-type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          resolve({ body: data, statusCode: res.statusCode ?? 0 });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

test("server starts and stops successfully", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    assert.ok(server.url);
    assert.ok(server.url.startsWith("http://"));
    assert.ok(typeof server.close === "function");

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);
    assert.ok(port > 0);

    await server.close();
  });
});

test("server /api/packages returns valid state JSON", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/packages", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(typeof body === "object");
    assert.ok("cwd" in body);
    assert.ok("installed" in body);
    assert.ok("manifest" in body);
    assert.ok("packageRoot" in body);
    assert.ok(Array.isArray(body.installed));
    assert.ok(Array.isArray(body.manifest.dependencies));

    await server.close();
  });
});

test("server /api/config returns config data", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/config", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(typeof body === "object");

    await server.close();
  });
});

test("server /api/status returns project status", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/status", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok("issues" in body);
    assert.ok(Array.isArray(body.issues));

    await server.close();
  });
});

test("server /api/tasks returns tasks list", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/tasks", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok("tasks" in body);
    assert.ok(Array.isArray(body.tasks));

    await server.close();
  });
});

test("server returns 404 for unknown API routes", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/nonexistent", "127.0.0.1", port);

    assert.equal(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.ok("error" in body);

    await server.close();
  });
});

test("server returns 405 for unsupported methods on static routes", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/", "127.0.0.1", port, {});

    assert.equal(response.statusCode, 405);
    const body = JSON.parse(response.body);
    assert.ok("error" in body);

    await server.close();
  });
});

test("server /api/search requires query parameter", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/search", "127.0.0.1", port);

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("q"));

    await server.close();
  });
});

test("server /api/download validates request body", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/api/download", "127.0.0.1", port, {});

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("source"));

    await server.close();
  });
});

test("server /api/tasks/cancel validates body id", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/api/tasks/cancel", "127.0.0.1", port, { id: "nonexistent-id" });

    assert.equal(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("not found"));

    await server.close();
  });
});

test("server html page is served at root path", async () => {
  await withTempDir(async () => {
    const server = await startPackageServer({
      host: "127.0.0.1",
      port: 0,
    });

    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /html/i);

    await server.close();
  });
});
