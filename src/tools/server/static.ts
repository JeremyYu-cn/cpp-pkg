import type { ServerResponse } from "node:http";
import { promises as fsp } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { HttpError } from "./errors";

const DEFAULT_STATIC_ROOT = path.resolve(__dirname, "../../server-ui");
const DEVELOPMENT_STATIC_ROOT = path.resolve(__dirname, "../../../dist/server-ui");
const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function getStaticRoot() {
  if (fs.existsSync(path.join(DEFAULT_STATIC_ROOT, "index.html"))) {
    return DEFAULT_STATIC_ROOT;
  }

  return DEVELOPMENT_STATIC_ROOT;
}

async function sendStaticFile(res: ServerResponse, filePath: string) {
  const content = await fsp.readFile(filePath);
  const contentType =
    MIME_TYPES.get(path.extname(filePath).toLowerCase()) ||
    "application/octet-stream";

  res.writeHead(200, {
    "cache-control": "no-store",
    "content-length": content.byteLength,
    "content-type": contentType,
  });
  res.end(content);
}

export async function handleStaticRequest(
  res: ServerResponse,
  requestUrl: URL,
) {
  const staticRoot = getStaticRoot();
  const relativePath =
    decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") ||
    "index.html";
  const resolvedPath = path.resolve(staticRoot, relativePath);
  const rootWithSeparator = staticRoot.endsWith(path.sep)
    ? staticRoot
    : `${staticRoot}${path.sep}`;

  if (
    resolvedPath !== staticRoot &&
    !resolvedPath.startsWith(rootWithSeparator)
  ) {
    throw new HttpError(403, "Static path is outside of the web root.");
  }

  try {
    const stat = await fsp.stat(resolvedPath);

    if (stat.isFile()) {
      await sendStaticFile(res, resolvedPath);
      return;
    }
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== "ENOENT") {
      throw error;
    }
  }

  await sendStaticFile(res, path.join(staticRoot, "index.html"));
}
