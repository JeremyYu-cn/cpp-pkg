import type { IncomingMessage, ServerResponse } from "node:http";
import { rm } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { addPackageManifestDependency } from "../../public/manifest";
import { resolvePackageRootPath, resolvePublicIncludePath, resolveProjectsRootPath, resolveArchiveCachePath, getDepsFilePath, getArchiveCachePath } from "../../public/packagePath";
import { getVCPkg } from "../download/main";
import { getPackageInfo } from "../info";
import { getLockFilePath } from "../lockfile";
import { checkPackageOutdated } from "../outdated";
import { auditPackages } from "../audit";
import { searchGitHubPackages } from "../search";
import { removeInstalledPackage } from "../manage/index";
import { handleConfigRequest } from "./config";
import { HttpError } from "./errors";
import { readJsonBody, sendJson } from "./response";
import { handleSourceRequest } from "./sources";
import { handleStatusRequest } from "./status";
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

  if (requestUrl.pathname === "/api/status" || requestUrl.pathname.startsWith("/api/status/")) {
    await handleStatusRequest(req, res, requestUrl);
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

  if (req.method === "GET" && requestUrl.pathname === "/api/outdated") {
    const installed = (await readServerState()).installed;
    const proxyOpts = {
      ...(options.httpProxy ? { httpProxy: options.httpProxy } : {}),
      ...(options.httpsProxy ? { httpsProxy: options.httpsProxy } : {}),
    };

    const results = await Promise.allSettled(
      installed.map((dep) =>
        checkPackageOutdated(dep, proxyOpts).then((r) => ({
          name: dep.name,
          ...r,
        })),
      ),
    );

    const packages = results.map((r) =>
      r.status === "fulfilled" ? r.value : { name: "unknown", currentVersion: "", outdated: false, error: r.reason?.message || String(r.reason) },
    );

    sendJson(res, 200, { packages });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname.startsWith("/api/info/")) {
    const selector = decodeURIComponent(requestUrl.pathname.slice("/api/info/".length));
    const info = await getPackageInfo(selector);

    if (!info) {
      throw new HttpError(404, `Package "${selector}" not found.`);
    }

    sendJson(res, 200, { package: info });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/clean") {
    const body = await readJsonBody(req);

    if (!isRecord(body)) {
      throw new HttpError(400, "Request body must be a JSON object.");
    }

    const cleanAll = Boolean(readOptionalBoolean(body, "all"));
    const targets: { path: string; label: string }[] = [
      { path: resolveArchiveCachePath(), label: "cache" },
      { path: resolvePublicIncludePath(), label: "include" },
      { path: resolveProjectsRootPath(), label: "projects" },
      { path: getDepsFilePath(), label: "deps" },
    ];

    if (cleanAll) {
      targets.push(
        { path: resolvePackageRootPath(), label: "package root" },
        { path: getLockFilePath(), label: "lockfile" },
      );
    }

    const removed: string[] = [];
    const errors: string[] = [];

    for (const target of targets) {
      try {
        await rm(target.path, { force: true, recursive: true });
        removed.push(target.path);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        errors.push(`${target.label}: ${(error as Error).message}`);
      }
    }

    sendJson(res, 200, { removed, errors: errors.length ? errors : undefined });
    return;
  }

  if (req.method === "DELETE" && requestUrl.pathname.startsWith("/api/packages/")) {
    const selector = decodeURIComponent(requestUrl.pathname.slice("/api/packages/".length));

    const task = enqueuePackageTask(
      "remove",
      `Remove ${selector}`,
      async () => {
        const result = await removeInstalledPackage(selector);
        return { ...(await readServerState()), removed: result };
      },
    );

    sendJson(res, 202, { task });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/audit") {
    const task = enqueuePackageTask(
      "audit",
      "Audit installed packages",
      async () => {
        const results = await auditPackages({});
        return { audit: results } as never;
      },
    );

    sendJson(res, 202, { task });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/cache") {
    const cacheDir = getArchiveCachePath();
    let entries: string[] = [];

    try {
      entries = await readdir(cacheDir);
    } catch {
      // cache dir may not exist
    }

    sendJson(res, 200, { cacheDir, entries });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/cache/clean") {
    const cacheDir = getArchiveCachePath();
    let removedCount = 0;

    try {
      const files = await readdir(cacheDir);
      await Promise.all(files.map((f) => rm(path.join(cacheDir, f), { force: true }).then(() => { removedCount++; })));
    } catch {
      // cache dir may not exist
    }

    sendJson(res, 200, { removedCount });
    return;
  }

  throw new HttpError(404, "API route not found.");
}
