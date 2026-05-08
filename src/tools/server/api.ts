import type { IncomingMessage, ServerResponse } from "node:http";
import { addPackageManifestDependency } from "../../public/manifest";
import { getVCPkg } from "../download/main";
import { searchGitHubPackages } from "../search";
import { HttpError } from "./errors";
import { readJsonBody, sendJson } from "./response";
import { readServerState } from "./state";
import type { PackageServerOptions } from "./types";
import {
  getSearchLimit,
  isRecord,
  readInstallOptions,
  readManifestAddOptions,
  readOptionalBoolean,
  readString,
} from "./validators";

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  requestUrl: URL,
  options: PackageServerOptions,
) {
  if (req.method === "GET" && requestUrl.pathname === "/api/packages") {
    sendJson(res, 200, await readServerState());
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/search") {
    const query = readString(requestUrl.searchParams.get("q"), "q");
    const language = requestUrl.searchParams.get("language") || "C++";
    const results = await searchGitHubPackages(query, {
      ...(options.httpProxy ? { httpProxy: options.httpProxy } : {}),
      ...(options.httpsProxy ? { httpsProxy: options.httpsProxy } : {}),
      language,
      limit: getSearchLimit(requestUrl.searchParams.get("limit")),
    });

    sendJson(res, 200, { results });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/download") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    await getVCPkg(
      readString(body.source, "source"),
      readInstallOptions(body, options),
    );
    sendJson(res, 200, await readServerState());
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/manifest/add") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    const dependency = await addPackageManifestDependency(
      readString(body.source, "source"),
      readManifestAddOptions(body),
    );

    if (readOptionalBoolean(body, "install")) {
      await getVCPkg(
        dependency.dependency.source,
        readInstallOptions(body, options),
      );
    }

    sendJson(res, 200, await readServerState());
    return;
  }

  throw new HttpError(404, "API route not found.");
}
