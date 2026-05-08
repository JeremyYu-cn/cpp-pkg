import { promises as fsp } from "node:fs";
import path from "node:path";
import { normalizeTrackedPath } from "../deps";
import { directoryClaimedByOthers } from "./claims";
import { compareByDepthDescending, toFilesystemPath } from "./paths";

function collectParentDirectories(paths: string[]) {
  const directories = new Set<string>();

  for (const targetPath of paths) {
    let current = path.posix.dirname(normalizeTrackedPath(targetPath));

    while (current && current !== ".") {
      directories.add(current);
      current = path.posix.dirname(current);
    }
  }

  return [...directories].sort(compareByDepthDescending);
}

async function pruneEmptyDirectory(
  installRootPath: string,
  directoryPath: string,
  otherClaimedPaths: Set<string>,
) {
  if (directoryClaimedByOthers(directoryPath, otherClaimedPaths)) {
    return;
  }

  const filesystemPath = toFilesystemPath(installRootPath, directoryPath);

  try {
    const entries = await fsp.readdir(filesystemPath);

    if (!entries.length) {
      await fsp.rmdir(filesystemPath);
    }
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (
      nodeError.code === "ENOENT" ||
      nodeError.code === "ENOTDIR" ||
      nodeError.code === "ENOTEMPTY"
    ) {
      return;
    }

    throw error;
  }
}

export async function pruneEmptyParents(
  installRootPath: string,
  paths: string[],
  otherClaimedPaths: Set<string>,
) {
  for (const directoryPath of collectParentDirectories(paths)) {
    await pruneEmptyDirectory(
      installRootPath,
      directoryPath,
      otherClaimedPaths,
    );
  }
}

export async function pruneInstallRoot(installRootPath: string) {
  try {
    const rootEntries = await fsp.readdir(installRootPath);

    if (!rootEntries.length) {
      await fsp.rmdir(installRootPath);
    }
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (
      nodeError.code !== "ENOENT" &&
      nodeError.code !== "ENOTDIR" &&
      nodeError.code !== "ENOTEMPTY"
    ) {
      throw error;
    }
  }
}
