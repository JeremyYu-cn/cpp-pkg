import { test } from "vitest";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const originalCwd = process.cwd();

let startPackageServer: typeof import("../src/tools/server/index").startPackageServer;

function clearDistCache() {
  for (const cachePath of Object.keys(require.cache)) {
    if (cachePath.includes(`${path.sep}dist${path.sep}`)) {
      delete require.cache[cachePath];
    }
  }
}

async function withTempDir(callback: TempDirCallback) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cppkg-api-test-"));

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

function httpPost(
  urlPath: string,
  host: string,
  port: number,
  payload: unknown,
): Promise<{
  body: string;
  headers: Record<string, string>;
  statusCode: number;
}> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        host,
        path: urlPath,
        port,
        method: "POST",
        headers: {
          "content-length": Buffer.byteLength(body),
          "content-type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          resolve({ body: data, headers: res.headers as Record<string, string>, statusCode: res.statusCode ?? 0 });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function startServer() {
  clearDistCache();
  const serverModule = require("../dist/tools/server/index.js");
  startPackageServer = serverModule.startPackageServer;

  return startPackageServer({
    host: "127.0.0.1",
    port: 0,
  });
}

test("search endpoint returns 400 for missing query parameter", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/search", "127.0.0.1", port);

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("q"));

    await server.close();
  });
});

test("search endpoint returns 400 for empty query parameter", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/search?q=", "127.0.0.1", port);

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("q"));

    await server.close();
  });
});

test("status endpoint returns issues array", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/status", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    const body = JSON.parse(response.body);
    assert.ok("issues" in body);
    assert.ok(Array.isArray(body.issues));

    await server.close();
  });
});

test("download endpoint requires source in body", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/api/download", "127.0.0.1", port, {});

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("source"));

    await server.close();
  });
});

test("download endpoint requires valid JSON body", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/api/download", "127.0.0.1", port, "not-json");

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("JSON"));

    await server.close();
  });
});

test("download endpoint returns 400 when source is empty", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/api/download", "127.0.0.1", port, { source: "" });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("source"));

    await server.close();
  });
});

test("manifest/add endpoint requires source in body", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/api/manifest/add", "127.0.0.1", port, {});

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("source"));

    await server.close();
  });
});

test("tasks/cancel endpoint validates task ID", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpPost("/api/tasks/cancel", "127.0.0.1", port, { id: "" });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("id"));

    await server.close();
  });
});

test("packages endpoint returns JSON content type", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/packages", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);

    await server.close();
  });
});

test("config endpoint returns config object", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/config", "127.0.0.1", port);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(typeof body === "object");

    await server.close();
  });
});

test("tasks endpoint returns tasks array", async () => {
  await withTempDir(async () => {
    const server = await startServer();
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

test("API returns 404 for unknown route", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/unknown-route", "127.0.0.1", port);

    assert.equal(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("not found"));

    await server.close();
  });
});

test("search endpoint returns 400 for invalid limit", async () => {
  await withTempDir(async () => {
    const server = await startServer();
    const parsedUrl = new URL(server.url);
    const port = parseInt(parsedUrl.port, 10);

    const response = await httpGet("/api/search?q=test&limit=invalid", "127.0.0.1", port);

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error.includes("limit"));

    await server.close();
  });
});
