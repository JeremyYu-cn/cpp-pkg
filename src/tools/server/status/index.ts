import type { IncomingMessage, ServerResponse } from "node:http";
import { getProjectStatus } from "../../status";
import { HttpError } from "../errors";
import { sendJson } from "../response";

export async function handleStatusRequest(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
) {
  if (req.method === "GET" && requestUrl.pathname === "/api/status") {
    sendJson(res, 200, await getProjectStatus());
    return;
  }

  throw new HttpError(404, "Status API route not found.");
}
