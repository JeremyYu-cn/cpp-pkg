import path from "node:path";
import { normalizeTrackedPath } from "../deps";
import {
  IGNORED_DIRECTORY_NAMES,
  SOURCE_EXTENSIONS,
} from "./constants";

export function normalizeIncludePath(value: string) {
  return value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

export function normalizePackageKey(value: string) {
  return value.trim().toLowerCase();
}

export function getTopLevelPath(value: string) {
  return normalizeTrackedPath(value).split("/").filter(Boolean)[0] ?? "";
}

export function isSourceFile(filePath: string) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isInsideDirectory(parentPath: string, targetPath: string) {
  const relativePath = path.relative(parentPath, targetPath);

  return Boolean(relativePath) && !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath);
}

export function shouldSkipDirectory(
  directoryName: string,
  directoryPath: string,
  packageRootPath: string,
) {
  if (IGNORED_DIRECTORY_NAMES.has(directoryName)) {
    return true;
  }

  return directoryPath === packageRootPath ||
    isInsideDirectory(packageRootPath, directoryPath);
}
