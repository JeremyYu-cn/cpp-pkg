import type { InstalledDependency } from "../../types/global";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { getTrackedInstallPaths } from "../deps";
import { directoryClaimedByOthers, getOtherClaimedPaths } from "./claims";
import { compareByDepthDescending, toFilesystemPath } from "./paths";
import { pruneEmptyParents, pruneInstallRoot } from "./prune";
import type { RemoveFilesResult } from "./types";

async function removeTrackedPath(
  installRootPath: string,
  targetPath: string,
  otherClaimedPaths: Set<string>,
  removedPaths: string[],
  skippedPaths: string[],
) {
  const filesystemPath = toFilesystemPath(installRootPath, targetPath);

  try {
    const stat = await fsp.lstat(filesystemPath);

    if (stat.isDirectory()) {
      if (directoryClaimedByOthers(targetPath, otherClaimedPaths)) {
        skippedPaths.push(targetPath);
        return;
      }

      await fsp.rm(filesystemPath, {
        force: true,
        recursive: true,
      });
      removedPaths.push(targetPath);
      return;
    }

    if (otherClaimedPaths.has(targetPath)) {
      skippedPaths.push(targetPath);
      return;
    }

    await fsp.rm(filesystemPath, {
      force: true,
    });
    removedPaths.push(targetPath);
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export async function removeDependencyFiles(
  dependency: InstalledDependency,
  otherDependencies: InstalledDependency[],
): Promise<RemoveFilesResult> {
  const installRootPath = path.resolve(
    process.cwd(),
    dependency.install.target,
  );
  const installPath =
    path.relative(process.cwd(), installRootPath) || dependency.install.target;
  const ownPaths = getTrackedInstallPaths(dependency).sort(
    compareByDepthDescending,
  );
  const otherClaimedPaths = getOtherClaimedPaths(
    dependency,
    otherDependencies,
  );
  const removedPaths: string[] = [];
  const skippedPaths: string[] = [];

  for (const targetPath of ownPaths) {
    await removeTrackedPath(
      installRootPath,
      targetPath,
      otherClaimedPaths,
      removedPaths,
      skippedPaths,
    );
  }

  await pruneEmptyParents(
    installRootPath,
    [
      ...dependency.install.headers,
      ...removedPaths,
    ],
    otherClaimedPaths,
  );

  await pruneInstallRoot(installRootPath);

  return {
    installPath,
    removedPaths: removedPaths.sort(compareByDepthDescending),
    skippedPaths: skippedPaths.sort(compareByDepthDescending),
  };
}
