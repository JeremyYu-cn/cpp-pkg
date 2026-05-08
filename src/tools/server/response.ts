import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpError } from "./errors";

const BODY_LIMIT_BYTES = 1024 * 1024;

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
) {
  const body = `${JSON.stringify(payload, null, 2)}\n`;

  res.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
  });
  res.end(body);
}

export async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    size += buffer.byteLength;

    if (size > BODY_LIMIT_BYTES) {
      throw new HttpError(413, "Request body is too large.");
    }

    chunks.push(buffer);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
