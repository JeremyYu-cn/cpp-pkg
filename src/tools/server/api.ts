import type { IncomingMessage, ServerResponse } from "node:http";
import { addPackageManifestDependency } from "../../public/manifest";
import { getVCPkg } from "../download/main";
import { searchGitHubPackages } from "../search";
import { handleConfigRequest } from "./config";
import { HttpError } from "./errors";
import { readJsonBody, sendJson } from "./response";
import { handleSourceRequest } from "./sources";
import { readServerState } from "./state";
import { handleTaskEvents } from "./taskEvents";
import {
  cancelPackageTask,
  enqueuePackageTask,
  getPackageTasks,
} from "./tasks";
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
  if (requestUrl.pathname === "/api/config" || requestUrl.pathname.startsWith("/api/config/")) {
    await handleConfigRequest(req, res, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/api/source" || requestUrl.pathname.startsWith("/api/source/")) {
    await handleSourceRequest(req, res, requestUrl);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/packages") {
    sendJson(res, 200, await readServerState());
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/tasks") {
    sendJson(res, 200, { tasks: getPackageTasks() });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/tasks/events") {
    handleTaskEvents(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/tasks/cancel") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    const task = cancelPackageTask(readString(body.id, "id"));

    if (!task) {
      throw new HttpError(404, "Task not found.");
    }

    sendJson(res, 200, { task });
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

    const source = readString(body.source, "source");
    const installOptions = readInstallOptions(body, options);
    const task = enqueuePackageTask(
      "download",
      `Download ${source}`,
      async () => {
        await getVCPkg(source, installOptions);
        return readServerState();
      },
    );

    sendJson(res, 202, { task });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/manifest/add") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    const source = readString(body.source, "source");
    const addOptions = readManifestAddOptions(body);
    const installOptions = readInstallOptions(body, options);
    const shouldInstall = Boolean(readOptionalBoolean(body, "install"));
    const task = enqueuePackageTask(
      "manifest:add",
      shouldInstall ? `Add and install ${source}` : `Add ${source}`,
      async () => {
        const dependency = await addPackageManifestDependency(source, addOptions);

        if (shouldInstall) {
          await getVCPkg(dependency.dependency.source, installOptions);
        }

        return readServerState();
      },
    );

    sendJson(res, 202, { task });
    return;
  }

  throw new HttpError(404, "API route not found.");
}
