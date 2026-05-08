import type { GetPkgOptions } from "../../types/global";
import { readInstalledDependencies } from "../deps";
import { getVCPkg } from "../download/main";
import { logger } from "../logger";
import { removeDependencyFiles } from "./files";
import {
  getDependencyIdentity,
  resolveInstalledDependency,
} from "./select";
import { getUpdatedPackageOptions } from "./updateOptions";

export async function refreshInstalledPackage(
  targetSelector: string,
  options: GetPkgOptions,
) {
  const current = await readInstalledDependencies();
  const dependency = resolveInstalledDependency(
    current.dependencies,
    targetSelector,
  );
  const otherDependencies = current.dependencies.filter(
    (item) => getDependencyIdentity(item) !== getDependencyIdentity(dependency),
  );
  const removeResult = await removeDependencyFiles(
    dependency,
    otherDependencies,
  );

  logger.info(
    `Refreshing ${dependency.name} from ${dependency.repository.url} (${removeResult.removedPaths.length} tracked paths cleaned)`,
  );

  if (removeResult.skippedPaths.length) {
    logger.warn(
      `Preserved ${removeResult.skippedPaths.length} shared path(s): ${removeResult.skippedPaths.join(", ")}`,
    );
  }

  await getVCPkg(
    dependency.repository.url,
    getUpdatedPackageOptions(dependency, options),
  );

  return dependency;
}
