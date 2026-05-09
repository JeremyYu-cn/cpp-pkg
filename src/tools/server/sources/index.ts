import type { IncomingMessage, ServerResponse } from "node:http";
import { getErrorMessage, HttpError } from "../errors";
import { readJsonBody, sendJson } from "../response";
import { isRecord, readString } from "../validators";
import { inferSourceFormValues } from "./infer";

function inferSource(input: string) {
  try {
    return inferSourceFormValues(input);
  } catch (error: unknown) {
    throw new HttpError(400, getErrorMessage(error));
  }
}

export async function handleSourceRequest(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
) {
  if (req.method === "POST" && requestUrl.pathname === "/api/source/infer") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    sendJson(res, 200, {
      suggestion: inferSource(readString(body.source, "source")),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/source/infer") {
    sendJson(res, 200, {
      suggestion: inferSource(readString(requestUrl.searchParams.get("q"), "q")),
    });
    return;
  }

  throw new HttpError(404, "Source API route not found.");
}
