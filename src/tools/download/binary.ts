import type { GetPkgOptions } from "../../types/global";
import type { PreparedArchive, ProviderRelease, ResolvedInputSource } from "./types";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { resolvePackageRootPath } from "../../public/packagePath";
import { normalizeTrackedPath, upsertInstalledDependency } from "../deps";
import { logger } from "../logger";
import { buildInstalledDependency } from "./metadata";

const DEFAULT_BINARY_PATTERNS = [
  "*.a",
  "*.so",
  "*.so.*",
  "*.dylib",
  "*.lib",
  "*.dll",
  "*.pdb",
  "*.exe",
];

function getBinaryTargetDir(platform: string, arch: string) {
  return path.join(resolvePackageRootPath(), "bin", platform, arch);
}

function isExecutable(mode: number) {
  return (mode & 0o111) !== 0;
}

function isSharedLibrary(filePath: string) {
  const lower = filePath.toLowerCase();
  return lower.endsWith(".so") || /\.[0-9]+\.so$/.test(lower) ||
    lower.endsWith(".dylib") || lower.endsWith(".dll");
}

/**
 * Recursively collects binary files matching the given patterns from a directory.
 */
async function collectBinaryFiles(
  dirPath: string,
  patterns: Set<string>,
  collected: string[] = [],
): Promise<string[]> {
  let entries: { name: string; isDirectory(): boolean; isFile(): boolean }[];

  try {
    const rawEntries = await fsp.readdir(dirPath, { withFileTypes: true });
    entries = rawEntries as unknown as typeof entries;
  } catch {
    return collected;
  }

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name.startsWith("__")) {
        continue;
      }
      await collectBinaryFiles(entryPath, patterns, collected);
      continue;
    }

    if (entry.isFile()) {
      const lowerName = entry.name.toLowerCase();
      const matched = [...patterns].some((pattern) => {
        if (pattern === "*.a" && lowerName.endsWith(".a")) {
          return true;
        }

        if (pattern === "*.so" && lowerName.endsWith(".so")) {
          return true;
        }

        if (pattern === "*.so.*" && /\.[0-9]+\.so$/.test(lowerName)) {
          return true;
        }

        if (pattern === "*.dylib" && lowerName.endsWith(".dylib")) {
          return true;
        }

        if (pattern === "*.lib" && lowerName.endsWith(".lib")) {
          return true;
        }

        if (pattern === "*.dll" && lowerName.endsWith(".dll")) {
          return true;
        }

        if (pattern === "*.pdb" && lowerName.endsWith(".pdb")) {
          return true;
        }

        if (pattern === "*.exe" && lowerName.endsWith(".exe")) {
          return true;
        }

        return false;
      });

      if (matched) {
        collected.push(entryPath);
      }
    }
  }

  return collected;
}

function getBinaryPatterns(options: GetPkgOptions) {
  const binary = typeof options.binary === "object" ? options.binary : undefined;

  if (binary?.pattern) {
    return new Set(
      binary.pattern
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    );
  }

  return new Set(DEFAULT_BINARY_PATTERNS);
}

function getBinaryInstallName(filePath: string) {
  return path.basename(filePath);
}

/**
 * Installs pre-built binary artifacts from the prepared source archive into cpp_libs/bin/[platform]/[arch]/.
 */
export async function installBinaryPackage(
  inputSource: ResolvedInputSource,
  release: ProviderRelease | null,
  prepared: PreparedArchive,
  options: GetPkgOptions = {},
) {
  const binaryOpts = typeof options.binary === "object" ? options.binary : {};
  const platform = binaryOpts.platform || process.platform;
  const arch = binaryOpts.arch || process.arch;
  const binaryDir = getBinaryTargetDir(platform, arch);
  const patterns = getBinaryPatterns(options);

  logger.info(`Collecting binary files from ${prepared.sourceRootPath}`);
  const binaryFiles = await collectBinaryFiles(prepared.sourceRootPath, patterns);

  if (!binaryFiles.length) {
    throw new Error(
      `No binary files found matching the selected patterns in ${prepared.sourceRootPath}.`,
    );
  }

  await fsp.mkdir(binaryDir, { recursive: true });

  const installedEntries = new Set<string>();

  for (const binaryPath of binaryFiles) {
    const installName = getBinaryInstallName(binaryPath);
    const targetPath = path.join(binaryDir, installName);

    await fsp.copyFile(binaryPath, targetPath);

    try {
      const stat = await fsp.stat(binaryPath);

      if (isExecutable(stat.mode) || isSharedLibrary(binaryPath)) {
        await fsp.chmod(targetPath, 0o755);
      }
    } catch {
      // Preserve original permissions if stat fails
    }

    const relativePath = normalizeTrackedPath(
      path.join("bin", platform, arch, installName),
    );
    installedEntries.add(relativePath);
  }

  logger.success(
    `Installed ${binaryFiles.length} binary file(s) into ${path.relative(process.cwd(), binaryDir)}`,
  );

  const targetDirRelative = path.relative(process.cwd(), binaryDir) || binaryDir;

  const installedDependency = buildInstalledDependency(
    inputSource,
    targetDirRelative,
    release,
    prepared.archive,
    [...installedEntries].sort(),
    [...installedEntries].sort(),
    "need-compile",
    "binary",
    options,
    prepared.integrity.sha256,
  );

  await upsertInstalledDependency(installedDependency);

  for (const entry of installedEntries) {
    logger.detail("Binary", entry);
  }

  logger.detail(
    "Recorded dependency metadata in",
    path.relative(process.cwd(), path.join(resolvePackageRootPath(), "..", "deps.json")),
  );
}
