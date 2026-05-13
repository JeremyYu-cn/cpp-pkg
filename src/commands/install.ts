import { Command } from "commander";
import path from "node:path";
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
import { resolveWorkspace } from "../tools/workspace";

type InstallOptions = Pick<GetPkgOptions, "cache" | "httpProxy" | "httpsProxy" | "offline" | "transitive"> & {
  frozenLockfile?: boolean;
  dryRun?: boolean;
  workspace?: boolean;
  workspaceContinue?: boolean;
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

async function installWorkspace(
  selectors: string[],
  options: InstallOptions,
  workspaceMembers: string[],
) {
  const originalCwd = process.cwd();
  let firstError: unknown = null;

  for (const memberDir of workspaceMembers) {
    const memberLabel = path.relative(originalCwd, memberDir) || memberDir;

    logger.info(`Installing in workspace member: ${memberLabel}`);

    try {
      process.chdir(memberDir);
      await installDependencies(selectors, options);
    } catch (error: unknown) {
      if (options.workspaceContinue) {
        logger.warn(
          `Failed to install in ${memberLabel}: ${getErrorMessage(error)}`,
        );
        firstError ??= error;
        continue;
      }

      throw error;
    } finally {
      process.chdir(originalCwd);
    }
  }

  if (firstError) {
    throw new Error(
      `Workspace install completed with errors: ${getErrorMessage(firstError)}`,
    );
  }
}

async function installDependencies(
  selectors: string[],
  options: InstallOptions,
) {
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

  if (options.dryRun) {
    logger.info(
      `Dry run: would install ${dependencies.length} package(s):`,
    );

    for (const dependency of dependencies) {
      logger.detail(
        "would install",
        `${getDependencyLabel(dependency)} (source: ${dependency.source})`,
      );
    }

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
    .option("--offline", "Only use cached archives, no network requests")
    .option("--dry-run", "Log what would be installed without downloading")
    .option(
      "--frozen-lockfile",
      "Require cppkg-lock.json to match cppkg.json before installing",
    )
    .option(
      "--no-transitive",
      "Skip resolution of transitive dependencies",
    )
    .action(async (selectors: string[], options: InstallOptions) => {
      if (options.workspace) {
        const workspace = resolveWorkspace();

        if (!workspace || !workspace.packages.length) {
          logger.warn(
            "No workspace configuration found. Use --workspace only in a workspace root.",
          );
          return;
        }

        await installWorkspace(selectors, options, workspace.packages);
        return;
      }

      await installDependencies(selectors, options);
    });
}
