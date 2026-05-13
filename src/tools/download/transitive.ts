import type { GetPkgOptions } from "../../types/global";
import type { ResolvedInputSource } from "./types";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { getProjectsRootPath } from "../../public/packagePath";
import { logger } from "../logger";
import { resolveInputSource } from "./sources";

export type TransitiveResult = {
  installed: string[];
  relations: Map<string, string[]>;
};

type InstallFn = (source: string, options: GetPkgOptions) => Promise<void>;

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "").replace(/\.git$/i, "").toLowerCase();
}

function resolveInstallDir(inputSource: ResolvedInputSource) {
  return path.join(getProjectsRootPath(), inputSource.projectInstallDirName);
}

function normalizeDependencies(rawDeps: unknown): { source: string }[] {
  if (!rawDeps) return [];

  if (Array.isArray(rawDeps)) {
    return rawDeps
      .map((entry: unknown) => {
        if (typeof entry === "string") return { source: entry };
        if (entry && typeof entry === "object" && "source" in (entry as Record<string, unknown>)) {
          return { source: (entry as { source: string }).source };
        }
        return null;
      })
      .filter((d): d is { source: string } => d !== null && typeof d.source === "string");
  }

  if (typeof rawDeps === "object" && rawDeps !== null) {
    return Object.entries(rawDeps as Record<string, unknown>)
      .map(([, value]) => {
        if (typeof value === "string") return { source: value };
        if (value && typeof value === "object" && "source" in (value as Record<string, unknown>)) {
          return { source: (value as { source: string }).source };
        }
        return null;
      })
      .filter((d): d is { source: string } => d !== null && typeof d.source === "string");
  }

  return [];
}

/**
 * Resolves transitive dependencies for a package by checking its cppkg.json
 * in the installed project directory and recursively installing any
 * dependencies found.
 */
export async function resolveTransitiveDependencies(
  source: string,
  options: GetPkgOptions,
  visited: Set<string>,
  installFn: InstallFn,
): Promise<TransitiveResult> {
  let inputSource: ResolvedInputSource;

  try {
    inputSource = resolveInputSource(source);
  } catch {
    return { installed: [], relations: new Map() };
  }

  const normalizedUrl = normalizeUrl(inputSource.repositoryUrl);
  const installRootPath = resolveInstallDir(inputSource);
  const manifestPath = path.join(installRootPath, "cppkg.json");

  let manifestContent: string;

  try {
    manifestContent = await fsp.readFile(manifestPath, "utf8");
  } catch {
    return { installed: [], relations: new Map() };
  }

  let manifestParsed: unknown;

  try {
    manifestParsed = JSON.parse(manifestContent);
  } catch {
    return { installed: [], relations: new Map() };
  }

  const manifest = manifestParsed as Record<string, unknown>;
  const deps = normalizeDependencies(manifest.dependencies);

  if (!deps.length) {
    return { installed: [], relations: new Map() };
  }

  logger.info(
    `Resolving transitive dependencies for ${inputSource.packageName} (${deps.length} found)`,
  );

  const installed: string[] = [];
  const relations = new Map<string, string[]>();
  const childUrls: string[] = [];

  for (const dep of deps) {
    let depInputSource: ResolvedInputSource;

    try {
      depInputSource = resolveInputSource(dep.source);
    } catch {
      continue;
    }

    const depNormalizedUrl = normalizeUrl(depInputSource.repositoryUrl);

    if (visited.has(depNormalizedUrl)) {
      childUrls.push(depNormalizedUrl);
      continue;
    }

    visited.add(depNormalizedUrl);
    childUrls.push(depNormalizedUrl);

    logger.info(`Installing transitive dependency: ${dep.source}`);

    await installFn(dep.source, { ...options, transitive: false });

    installed.push(depNormalizedUrl);

    const childResult = await resolveTransitiveDependencies(
      dep.source,
      options,
      visited,
      installFn,
    );

    installed.push(...childResult.installed.filter((u) => u !== depNormalizedUrl));

    for (const [parent, children] of childResult.relations) {
      if (!relations.has(parent)) {
        relations.set(parent, []);
      }

      const existing = relations.get(parent)!;

      for (const child of children) {
        if (!existing.includes(child)) {
          existing.push(child);
        }
      }
    }
  }

  if (childUrls.length) {
    relations.set(normalizedUrl, [...new Set(childUrls)]);
  }

  return { installed, relations };
}
