import type { GitHubRelease } from "../../../types/github";
import type {
  GitHubReleaseAsset,
  ProviderRelease,
} from "../types";
import path from "node:path";

export const ZIP_CONTENT_TYPES = new Set([
  "application/octet-stream",
  "application/x-zip-compressed",
  "application/zip",
]);

export function isZipAsset(asset: GitHubReleaseAsset) {
  const assetName = asset.name.toLowerCase();
  return (
    ZIP_CONTENT_TYPES.has(asset.content_type.toLowerCase()) ||
    assetName.endsWith(".zip")
  );
}

export function getPackageName(repoPath: string) {
  return repoPath.split("/").filter(Boolean).at(-1) ?? "package";
}

export function getProjectInstallDirName(identifier: string) {
  return identifier
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "project";
}

export function getArchiveNameFromURL(archiveURL: string) {
  const parsed = new URL(archiveURL);
  const rawName = decodeURIComponent(path.posix.basename(parsed.pathname));
  if (!rawName) {
    return `${parsed.hostname}.zip`;
  }
  return rawName.endsWith(".zip") ? rawName : `${rawName}.zip`;
}

export function getArchivePackageName(archiveURL: string) {
  const archiveName = getArchiveNameFromURL(archiveURL);
  return archiveName.replace(/\.zip$/i, "") || "package";
}

export function pickReleaseByTag<TRelease extends ProviderRelease>(
  releases: TRelease[],
  tag: string,
) {
  return (
    releases.find(
      (release) => release.tag_name === tag || release.name === tag,
    ) ?? null
  );
}
