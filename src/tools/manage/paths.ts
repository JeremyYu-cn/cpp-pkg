import path from "node:path";
import { normalizeTrackedPath } from "../deps";

export function getPathDepth(targetPath: string) {
  return normalizeTrackedPath(targetPath).split("/").filter(Boolean).length;
}

export function compareByDepthDescending(left: string, right: string) {
  return getPathDepth(right) - getPathDepth(left) || left.localeCompare(right);
}

export function toFilesystemPath(includeRootPath: string, trackedPath: string) {
  return path.join(
    includeRootPath,
    ...normalizeTrackedPath(trackedPath).split("/"),
  );
}
