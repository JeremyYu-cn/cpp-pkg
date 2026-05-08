import type {
  PackageActionValues,
  SearchResult,
  SearchValues,
  ServerState,
} from "./types";

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
  return requestJson<ServerState>("/api/packages");
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

export function runPackageAction(values: PackageActionValues, source?: string) {
  const endpoint = values.addToManifest ? "/api/manifest/add" : "/api/download";

  return requestJson<ServerState>(endpoint, {
    body: JSON.stringify(buildPackagePayload(values, source)),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}
