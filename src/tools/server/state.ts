import { readPackageManifest } from "../../public/manifest";
import { resolvePackageRootPath } from "../../public/packagePath";
import { readInstalledDependencies } from "../deps";
import { getErrorMessage } from "./errors";
import type {
  PackageServerManifestState,
  PackageServerState,
} from "./types";

async function readManifestState(): Promise<PackageServerManifestState> {
  try {
    return {
      dependencies: (await readPackageManifest()).dependencies,
    };
  } catch (error: unknown) {
    return {
      dependencies: [],
      error: getErrorMessage(error),
    };
  }
}

export async function readServerState(): Promise<PackageServerState> {
  const installed = await readInstalledDependencies();

  return {
    cwd: process.cwd(),
    installed: installed.dependencies,
    manifest: await readManifestState(),
    packageRoot: resolvePackageRootPath(),
  };
}
