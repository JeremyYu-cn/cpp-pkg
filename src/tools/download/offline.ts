import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getArchiveCachePath } from "../../public/packagePath";
import type { ArchiveDescriptor } from "./types";

function getCacheFileName(archive: ArchiveDescriptor) {
  const hash = crypto.createHash("sha256").update(archive.url).digest("hex")
    .slice(0, 16);
  const safeLabel = archive.label
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "archive.zip";
  const normalizedLabel = safeLabel.endsWith(".zip")
    ? safeLabel
    : `${safeLabel}.zip`;

  return `${hash}-${normalizedLabel}`;
}

function getCacheFilePath(archive: ArchiveDescriptor) {
  return path.join(getArchiveCachePath(), getCacheFileName(archive));
}

/**
 * Checks whether an archive URL is already available in the local cache.
 */
export function isArchiveInCache(archive: ArchiveDescriptor): boolean {
  const cachePath = getCacheFilePath(archive);

  try {
    const stat = fs.statSync(cachePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

/**
 * Returns the local cache path for an archive when available.
 */
export function getCachedArchivePath(archive: ArchiveDescriptor): string | null {
  if (isArchiveInCache(archive)) {
    return getCacheFilePath(archive);
  }

  return null;
}
