import { promises as fsp } from "node:fs";
import path from "node:path";
import { resolveArchiveCachePath } from "../public/packagePath";

export type CacheEntry = {
  modifiedAt: Date;
  name: string;
  path: string;
  size: number;
};

export type CleanCacheOptions = {
  olderThanDays?: number;
};

async function readCacheDirectory() {
  const cachePath = resolveArchiveCachePath();

  try {
    return {
      cachePath,
      entries: await fsp.readdir(cachePath, { withFileTypes: true }),
    };
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return { cachePath, entries: [] };
    }

    throw error;
  }
}

function shouldRemoveEntry(entry: CacheEntry, options: CleanCacheOptions) {
  if (options.olderThanDays === undefined) {
    return true;
  }

  const ageMs = Date.now() - entry.modifiedAt.getTime();

  return ageMs >= options.olderThanDays * 24 * 60 * 60 * 1000;
}

export function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export async function listArchiveCacheEntries(): Promise<CacheEntry[]> {
  const { cachePath, entries } = await readCacheDirectory();
  const cacheEntries: CacheEntry[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const entryPath = path.join(cachePath, entry.name);
    const stat = await fsp.stat(entryPath);

    cacheEntries.push({
      modifiedAt: stat.mtime,
      name: entry.name,
      path: entryPath,
      size: stat.size,
    });
  }

  return cacheEntries.sort((left, right) => left.name.localeCompare(right.name));
}

export async function cleanArchiveCache(options: CleanCacheOptions = {}) {
  const entries = await listArchiveCacheEntries();
  const removedEntries: CacheEntry[] = [];

  for (const entry of entries) {
    if (!shouldRemoveEntry(entry, options)) {
      continue;
    }

    await fsp.rm(entry.path, { force: true });
    removedEntries.push(entry);
  }

  return {
    removedEntries,
    totalBytes: removedEntries.reduce((total, entry) => total + entry.size, 0),
  };
}

export async function exportArchiveCache(targetPath: string): Promise<{ exported: number; totalBytes: number }> {
  const entries = await listArchiveCacheEntries();
  await fsp.mkdir(targetPath, { recursive: true });
  let exported = 0;
  let totalBytes = 0;

  for (const entry of entries) {
    const destPath = path.join(targetPath, entry.name);
    await fsp.copyFile(entry.path, destPath);
    exported++;
    totalBytes += entry.size;
  }

  return { exported, totalBytes };
}

export async function importArchiveCache(sourcePath: string): Promise<{ imported: number; totalBytes: number }> {
  const cachePath = resolveArchiveCachePath();
  await fsp.mkdir(cachePath, { recursive: true });
  let imported = 0;
  let totalBytes = 0;

  let sourceEntries: string[];
  try {
    sourceEntries = await fsp.readdir(sourcePath);
  } catch {
    throw new Error(`Cache source directory not found: ${sourcePath}`);
  }

  for (const entry of sourceEntries) {
    const srcPath = path.join(sourcePath, entry);
    const stat = await fsp.stat(srcPath);
    if (!stat.isFile()) continue;

    const destPath = path.join(cachePath, entry);
    await fsp.copyFile(srcPath, destPath);
    imported++;
    totalBytes += stat.size;
  }

  return { imported, totalBytes };
}
