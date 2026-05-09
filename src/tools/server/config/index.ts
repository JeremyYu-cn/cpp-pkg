import type { IncomingMessage, ServerResponse } from "node:http";
import {
  removeConfigValue,
  setConfigValue,
} from "../../../public/config";
import { getErrorMessage, HttpError } from "../errors";
import { readJsonBody, sendJson } from "../response";
import { isRecord, readString } from "../validators";
import { readConfigState } from "./state";

function runConfigMutation(action: () => void) {
  try {
    action();
  } catch (error: unknown) {
    throw new HttpError(400, getErrorMessage(error));
  }
}

export async function handleConfigRequest(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
) {
  if (req.method === "GET" && requestUrl.pathname === "/api/config") {
    sendJson(res, 200, readConfigState());
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/config/set") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    const key = readString(body.key, "key");
    const value = readString(body.value, "value");

    runConfigMutation(() => {
      setConfigValue(key, value);
    });
    sendJson(res, 200, readConfigState());
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/config/remove") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    const key = readString(body.key, "key");

    runConfigMutation(() => {
      removeConfigValue(key);
    });
    sendJson(res, 200, readConfigState());
    return;
  }

  throw new HttpError(404, "Config API route not found.");
}
