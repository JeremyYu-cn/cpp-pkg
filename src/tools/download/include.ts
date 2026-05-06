import type { ResolvedInputSource } from "./types";
import type { ProviderRelease, PreparedArchive } from "./types";
import type { GetPkgOptions } from "../../types/global";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { getPublicIncludePath } from "../../public/packagePath";
import { normalizeTrackedPath, upsertInstalledDependency } from "../deps";
import { logger } from "../logger";
import { buildInstalledDependency } from "./metadata";

const HEADER_EXTENSIONS = new Set([
  ".h",
  ".hh",
  ".hpp",
  ".hxx",
  ".inc",
  ".ipp",
  ".tpp",
]);

/**
 * Recursively checks whether a directory contains at least one header file.
 */
async function directoryContainsHeaders(dirPath: string): Promise<boolean> {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (await directoryContainsHeaders(entryPath)) {
        return true;
      }
      continue;
    }

    if (HEADER_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      return true;
    }
  }

  return false;
}

function resolveSubpath(rootPath: string, relativePath: string) {
  const resolvedRoot = path.resolve(rootPath);
  const normalizedPath = relativePath.trim().replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "");
  const resolvedPath = path.resolve(
    resolvedRoot,
    ...normalizedPath.split("/").filter(Boolean),
  );
  const relative = path.relative(resolvedRoot, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`includePath escapes the archive root: ${relativePath}`);
  }

  return resolvedPath;
}

async function collectExplicitIncludeDirs(
  rootPath: string,
  includePaths: string[],
) {
  const includeDirs: string[] = [];

  for (const includePath of includePaths) {
    const entryPath = resolveSubpath(rootPath, includePath);
    const stat = await fsp.stat(entryPath);

    if (!stat.isDirectory()) {
      throw new Error(`includePath is not a directory: ${includePath}`);
    }

    if (!await directoryContainsHeaders(entryPath)) {
      throw new Error(`includePath does not contain headers: ${includePath}`);
    }

    includeDirs.push(entryPath);
  }

  return includeDirs;
}

/**
 * Finds the most relevant include directories inside an extracted archive.
 */
export async function collectIncludeDirs(
  rootPath: string,
  includePaths: string[] = [],
): Promise<string[]> {
  if (includePaths.length) {
    return collectExplicitIncludeDirs(rootPath, includePaths);
  }

  const entries = await fsp.readdir(rootPath, { withFileTypes: true });
  const includeDirs: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name !== "include") {
      continue;
    }

    const entryPath = path.join(rootPath, entry.name);

    if (await directoryContainsHeaders(entryPath)) {
      includeDirs.push(entryPath);
    }
  }

  return includeDirs;
}

/**
 * Copies the selected include directories into the shared include root and records installed paths.
 */
async function mergeIncludeDirs(
  includeDirs: string[],
  targetIncludeDir: string,
  components: string[] = [],
) {
  await fsp.mkdir(targetIncludeDir, { recursive: true });

  const installedEntries = new Set<string>();
  const selectedComponents = new Set(components);

  for (const includeDir of includeDirs) {
    const entries = await fsp.readdir(includeDir, { withFileTypes: true });

    for (const entry of entries) {
      if (selectedComponents.size && !selectedComponents.has(entry.name)) {
        continue;
      }

      const sourcePath = path.join(includeDir, entry.name);
      const targetPath = path.join(targetIncludeDir, entry.name);
      const relativePath = normalizeTrackedPath(entry.name);

      if (entry.isDirectory()) {
        await fsp.cp(sourcePath, targetPath, {
          force: true,
          recursive: true,
        });
      } else {
        await fsp.cp(sourcePath, targetPath, {
          force: true,
        });
      }

      installedEntries.add(relativePath);
    }
  }

  if (selectedComponents.size && !installedEntries.size) {
    throw new Error(
      `No include components matched: ${components.join(", ")}`,
    );
  }

  return {
    headers: [...installedEntries].sort(),
    paths: [...installedEntries].sort(),
  };
}

/**
 * Installs one prepared archive into the shared include directory and records metadata.
 */
export async function installIncludePackage(
  inputSource: ResolvedInputSource,
  release: ProviderRelease | null,
  preparedArchive: PreparedArchive,
  options: GetPkgOptions = {},
) {
  const installRootPath = getPublicIncludePath();
  const installPath = path.relative(process.cwd(), installRootPath) || "cpp_libs";
  const installed = await mergeIncludeDirs(
    preparedArchive.includeDirs,
    installRootPath,
    options.components,
  );
  const installedDependency = buildInstalledDependency(
    inputSource,
    installPath,
    release,
    preparedArchive.archive,
    installed.headers,
    installed.paths,
    "header-only",
    "include",
    options,
    preparedArchive.integrity.sha256,
  );

  await upsertInstalledDependency(installedDependency);

  logger.success(`Installed ${inputSource.packageName} into ${installPath}`);
  logger.detail("Headers", installed.headers.join(", "));
  logger.detail(
    "Recorded dependency metadata in",
    path.relative(process.cwd(), path.join(installRootPath, "..", "deps.json")),
  );
}
