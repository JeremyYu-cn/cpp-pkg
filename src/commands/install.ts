import { Command } from "commander";
import type { GetPkgOptions } from "../types/global";
import {
  getManifestDependencyOptions,
  type ManifestDependency,
  readPackageManifest,
} from "../public/manifest";
import { getVCPkg } from "../tools/download/main";
import {
  getFrozenManifestDependencyOptions,
  requireLockedManifestDependencies,
} from "../tools/lockfile";
import { resolveInputSource } from "../tools/download/sources";
import {
  getRejectedPackageDownloadTasks,
  normalizePackageDownloadJobs,
  runPackageDownloadTasks,
} from "../tools/download/tasks";
import { getErrorMessage } from "../tools/errors";
import { logger } from "../tools/logger";
import {
  getManifestDependencySelectorVariants,
  getSelectorVariants,
} from "../tools/selectors";

type InstallOptions = Pick<GetPkgOptions, "cache" | "httpProxy" | "httpsProxy"> & {
  frozenLockfile?: boolean;
};

function getDependencyLabel(dependency: ManifestDependency) {
  if (dependency.name) {
    return dependency.name;
  }

  try {
    return resolveInputSource(dependency.source).packageName;
  } catch {
    return dependency.source;
  }
}

function matchesDependencySelector(
  dependency: ManifestDependency,
  selector: string,
) {
  const selectorVariants = getSelectorVariants(selector);
  const dependencyVariants = getManifestDependencySelectorVariants(
    dependency.source,
    dependency.name,
  );

  return [...selectorVariants].some((variant) => dependencyVariants.has(variant));
}

function resolveSelectedDependencies(
  dependencies: ManifestDependency[],
  selectors: string[],
) {
  if (!selectors.length) {
    return dependencies;
  }

  const selected = new Map<number, ManifestDependency>();

  for (const selector of selectors) {
    const matches = dependencies
      .map((dependency, index) => ({ dependency, index }))
      .filter(({ dependency }) =>
        matchesDependencySelector(dependency, selector),
      );

    if (!matches.length) {
      throw new Error(`Cannot find manifest dependency: ${selector}`);
    }

    if (matches.length > 1) {
      throw new Error(
        `Manifest dependency selector "${selector}" is ambiguous. Use one of: ${matches.map(({ dependency }) => getDependencyLabel(dependency)).join(", ")}`,
      );
    }

    const match = matches[0]!;
    selected.set(match.index, match.dependency);
  }

  return [...selected.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, dependency]) => dependency);
}

/**
 * Registers the command that installs dependencies from cppkg.json.
 */
export function registerInstallCommand(program: Command) {
  program
    .command("install")
    .description("Install dependencies declared in cppkg.json")
    .argument(
      "[packages...]",
      "Optional dependency names, repository paths, package names, or source URLs from cppkg.json",
    )
    .option("--http-proxy <url>", "HTTP request proxy, overrides config")
    .option("--https-proxy <url>", "HTTPS request proxy, overrides config")
    .option("--no-cache", "Bypass cached archives and refresh downloads")
    .option(
      "--frozen-lockfile",
      "Require cppkg-lock.json to match cppkg.json before installing",
    )
    .action(async (selectors: string[], options: InstallOptions) => {
      const manifest = await readPackageManifest();
      const dependencies = resolveSelectedDependencies(
        manifest.dependencies,
        selectors,
      );
      const taskJobs = normalizePackageDownloadJobs(undefined, dependencies.length);

      if (!dependencies.length) {
        logger.warn("No dependencies found in cppkg.json.");
        return;
      }

      const lockedDependencies = options.frozenLockfile
        ? await requireLockedManifestDependencies(dependencies)
        : [];
      const getInstallOptions = (dependency: ManifestDependency, index: number) =>
        options.frozenLockfile
          ? getFrozenManifestDependencyOptions(
              dependency,
              lockedDependencies[index]!,
              options,
            )
          : getManifestDependencyOptions(dependency, options);

      if (dependencies.length === 1) {
        const dependency = dependencies[0]!;

        await getVCPkg(
          dependency.source,
          getInstallOptions(dependency, 0),
        );
        return;
      }

      logger.info(`Installing ${dependencies.length} manifest package(s).`);

      const results = await runPackageDownloadTasks(
        dependencies.map((dependency, index) => ({
          item: dependency,
          label: getDependencyLabel(dependency),
          run: () => getVCPkg(
            dependency.source,
            getInstallOptions(dependency, index),
          ),
        })),
        { jobs: taskJobs },
      );
      const failures = getRejectedPackageDownloadTasks(results);

      if (!failures.length) {
        logger.success(`Installed ${dependencies.length} package(s).`);
        return;
      }

      const installedCount = dependencies.length - failures.length;

      if (installedCount > 0) {
        logger.warn(
          `Installed ${installedCount} of ${dependencies.length} package(s).`,
        );
      }

      for (const failure of failures) {
        logger.error(
          `Failed to install ${getDependencyLabel(failure.item)}: ${getErrorMessage(failure.reason)}`,
        );
      }

      throw new Error(
        `Failed to install ${failures.length} of ${dependencies.length} package(s).`,
      );
    });
}
