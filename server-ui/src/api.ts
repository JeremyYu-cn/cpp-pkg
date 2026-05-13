import type {
  PackageActionValues,
  SearchResult,
  SearchValues,
  SourceFormSuggestion,
} from "./types";
import {
  normalizeConfigState,
  normalizePackageTask,
  normalizeProjectStatus,
  normalizeServerState,
} from "./state";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

function splitLines(value: string | undefined) {
  const entries = value
    ?.split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries?.length ? entries : undefined;
}

function compactPayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      if (value === undefined || value === null || value === "") {
        return false;
      }

      if (Array.isArray(value) && value.length === 0) {
        return false;
      }

      return true;
    }),
  );
}

function buildPackagePayload(values: PackageActionValues, source?: string) {
  return compactPayload({
    branch: values.branch,
    cache: values.noCache ? false : undefined,
    checksum: values.checksum,
    components: splitLines(values.components),
    force: values.force,
    fullProject: values.fullProject,
    includePath: splitLines(values.includePath),
    install: values.install,
    name: values.name,
    patches: splitLines(values.patches),
    prerelease: values.prerelease,
    source: source || values.source,
    stripPrefix: values.stripPrefix,
    tag: values.tag,
    versionPolicy: values.versionPolicy,
    versionRange: values.versionRange,
  });
}

export function fetchPackages() {
  return requestJson<unknown>("/api/packages").then(normalizeServerState);
}

export async function fetchTasks() {
  const payload = await requestJson<{ tasks?: unknown[] }>("/api/tasks");

  return (payload.tasks ?? []).flatMap((task) => {
    const normalized = normalizePackageTask(task);

    return normalized ? [normalized] : [];
  });
}

export function fetchConfig() {
  return requestJson<unknown>("/api/config").then(normalizeConfigState);
}

export function fetchProjectStatus() {
  return requestJson<unknown>("/api/status").then(normalizeProjectStatus);
}

export function setConfigEntry(key: string, value: string) {
  return requestJson<unknown>("/api/config/set", {
    body: JSON.stringify({ key, value }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }).then(normalizeConfigState);
}

export function removeConfigEntry(key: string) {
  return requestJson<unknown>("/api/config/remove", {
    body: JSON.stringify({ key }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }).then(normalizeConfigState);
}

export async function searchPackages(values: SearchValues) {
  const params = new URLSearchParams({
    language: values.language || "C++",
    limit: String(values.limit || 10),
    q: values.query,
  });
  const payload = await requestJson<{ results: SearchResult[] }>(
    `/api/search?${params.toString()}`,
  );

  return payload.results;
}

export function inferPackageSource(source: string) {
  return requestJson<{ suggestion?: SourceFormSuggestion }>(
    "/api/source/infer",
    {
      body: JSON.stringify({ source }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  ).then(({ suggestion }) => {
    if (!suggestion) {
      throw new Error("Source suggestion response is invalid.");
    }

    return suggestion;
  });
}

export function runPackageAction(values: PackageActionValues, source?: string) {
  const endpoint = values.addToManifest ? "/api/manifest/add" : "/api/download";

  return requestJson<{ task: unknown }>(endpoint, {
    body: JSON.stringify(buildPackagePayload(values, source)),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }).then(({ task }) => {
    const normalized = normalizePackageTask(task);

    if (!normalized) {
      throw new Error("Task response is invalid.");
    }

    return { task: normalized };
  });
}

export function cancelTask(id: string) {
  return requestJson<{ task: unknown }>("/api/tasks/cancel", {
    body: JSON.stringify({ id }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  }).then(({ task }) => {
    const normalized = normalizePackageTask(task);

    if (!normalized) {
      throw new Error("Task response is invalid.");
    }

    return { task: normalized };
  });
}

export function fetchOutdatedPackages() {
  return requestJson<{ packages: unknown[] }>("/api/outdated").then(({ packages }) => packages);
}

export function fetchPackageInfo(selector: string) {
  return requestJson<{ package: unknown }>(`/api/info/${encodeURIComponent(selector)}`).then(({ package: pkg }) => pkg);
}

export function cleanPackages(all = false) {
  return requestJson<{ removed: string[] }>("/api/clean", {
    body: JSON.stringify({ all }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
