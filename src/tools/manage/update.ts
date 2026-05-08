import type { GetPkgOptions, InstalledDependency } from "../../types/global";
import { resolvePackageRootPath } from "../../public/packagePath";
import { readInstalledDependencies } from "../deps";
import {
  getRejectedPackageDownloadTasks,
  normalizePackageDownloadJobs,
  runPackageDownloadTasks,
} from "../download/tasks";
import { getErrorMessage } from "../errors";
import { logger } from "../logger";
import { refreshInstalledPackage } from "./refresh";
import { resolveInstalledDependency } from "./select";
import { hasExplicitVersionOption } from "./updateOptions";

export async function updateInstalledPackages(
  selector: string | undefined,
  options: GetPkgOptions = {},
) {
  const packageOptions = options;

  if (!selector && hasExplicitVersionOption(options)) {
    if (options.tag || options.branch) {
      throw new Error("Options --tag and --branch require a package selector.");
    }

    throw new Error("Version selection options require a package selector.");
  }

  const installed = await readInstalledDependencies();

  if (!installed.dependencies.length) {
    logger.warn(`No installed packages found in ${resolvePackageRootPath()}.`);
    return {
      updatedDependencies: [],
    };
  }

  const targetSelectors = selector
    ? [
        resolveInstalledDependency(installed.dependencies, selector).repository
          .url,
      ]
    : installed.dependencies.map((dependency) => dependency.repository.url);
  const taskJobs = normalizePackageDownloadJobs(undefined, targetSelectors.length);

  if (targetSelectors.length === 1) {
    return {
      updatedDependencies: [
        await refreshInstalledPackage(targetSelectors[0]!, packageOptions),
      ],
    };
  }

  if (targetSelectors.length > 1) {
    logger.info(`Updating ${targetSelectors.length} package(s).`);
  }

  const results = await runPackageDownloadTasks<string, InstalledDependency>(
    targetSelectors.map((targetSelector) => ({
      item: targetSelector,
      label: targetSelector,
      run: () => refreshInstalledPackage(targetSelector, packageOptions),
    })),
    { jobs: taskJobs },
  );
  const failures = getRejectedPackageDownloadTasks(results);
  const updatedDependencies = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  if (failures.length) {
    const updatedCount = updatedDependencies.length;

    if (updatedCount > 0) {
      logger.warn(
        `Updated ${updatedCount} of ${targetSelectors.length} package(s).`,
      );
    }

    for (const failure of failures) {
      logger.error(
        `Failed to update ${failure.item}: ${getErrorMessage(failure.reason)}`,
      );
    }

    throw new Error(
      `Failed to update ${failures.length} of ${targetSelectors.length} package(s).`,
    );
  }

  return {
    updatedDependencies,
  };
}
