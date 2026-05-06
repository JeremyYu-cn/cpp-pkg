import type { InstalledDependency } from "../../types/global";
import type { ManifestDependency } from "../../public/manifest";
import type { InspectPackageStatus } from "./types";
import { readPackageManifest } from "../../public/manifest";
import { resolveInputSource } from "../download/sources";
import { getTopLevelPath, normalizePackageKey } from "./path";

function addPackageKey(keys: Set<string>, value: string | undefined) {
  const normalized = normalizePackageKey(value ?? "");

  if (normalized) {
    keys.add(normalized);
  }
}

function addRepositoryPathKeys(keys: Set<string>, repositoryPath: string) {
  const segments = repositoryPath.split("/").filter(Boolean);

  addPackageKey(keys, segments.at(-1));
  addPackageKey(keys, segments.at(0));
}

export function getInstalledPackageKeys(dependencies: InstalledDependency[]) {
  const keys = new Set<string>();

  for (const dependency of dependencies) {
    addPackageKey(keys, dependency.name);
    addRepositoryPathKeys(keys, dependency.repository.path);

    for (const header of dependency.install.headers) {
      addPackageKey(keys, getTopLevelPath(header));
    }

    for (const trackedPath of dependency.install.paths) {
      addPackageKey(keys, getTopLevelPath(trackedPath));
    }
  }

  return keys;
}

export function getManifestPackageKeys(dependencies: ManifestDependency[]) {
  const keys = new Set<string>();

  for (const dependency of dependencies) {
    addPackageKey(keys, dependency.name);

    try {
      const source = resolveInputSource(dependency.source);

      addPackageKey(keys, source.packageName);
      addRepositoryPathKeys(keys, source.repositoryPath);
    } catch {
      addPackageKey(keys, dependency.source);
    }
  }

  return keys;
}

export async function readManifestDependencies() {
  try {
    return (await readPackageManifest()).dependencies;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.startsWith("Cannot find cppkg.json")) {
      return [];
    }

    throw error;
  }
}

export function getPackageStatus(
  packageName: string,
  installedKeys: Set<string>,
  manifestKeys: Set<string>,
): InspectPackageStatus {
  const key = normalizePackageKey(packageName);

  if (installedKeys.has(key)) {
    return "installed";
  }

  if (manifestKeys.has(key)) {
    return "declared";
  }

  return "missing";
}
