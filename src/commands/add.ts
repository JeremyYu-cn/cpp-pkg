import { Command } from "commander";
import {
  addPackageManifestDependency,
  getManifestDependencyOptions,
  type AddManifestDependencyOptions,
} from "../public/manifest";
import type { GetPkgOptions } from "../types/global";
import { collectOption } from "./options";
import { getVCPkg } from "../tools/download/main";
import { logger } from "../tools/logger";
import { resolveWorkspace } from "../tools/workspace";
import path from "node:path";

type AddOptions = AddManifestDependencyOptions &
  Pick<GetPkgOptions, "cache" | "httpProxy" | "httpsProxy" | "offline" | "transitive"> & {
    install?: boolean;
    dryRun?: boolean;
    workspace?: string;
  };

/**
 * Registers the command that adds one dependency to cppkg.json.
 */
export function registerAddCommand(program: Command) {
  program
    .command("add")
    .description("Add one dependency to cppkg.json, optionally installing it")
    .argument(
      "<source>",
      "GitHub owner/repo, GitHub/Gitee repository URL, or direct zip archive URL",
    )
    .option("--name <name>", "Dependency name to write in cppkg.json")
    .option("--tag <tag>", "Install a specific release tag or repository tag")
    .option("--branch <branch>", "Install a specific repository branch")
    .option(
      "--version-range <range>",
      "Install the latest release matching a semantic version range",
    )
    .option(
      "--version-policy <policy>",
      "Manifest version policy: latest-release, latest-prerelease, or default-branch",
    )
    .option(
      "--prerelease",
      "Allow prerelease versions when selecting the latest release",
    )
    .option(
      "--full-project",
      "Install the package as a full project and skip include-directory detection",
    )
    .option(
      "--include-path <path>",
      "Archive-relative include directory to write in cppkg.json; may be repeated",
      collectOption,
    )
    .option("--strip-prefix <path>", "Archive-relative directory to install from")
    .option(
      "--patches <path>",
      "Project-relative patch file to apply after extraction; may be repeated",
      collectOption,
    )
    .option(
      "--components <name>",
      "Top-level include/project entry to install; may be repeated",
      collectOption,
    )
    .option("--checksum <sha256>", "Expected archive SHA-256 checksum")
    .option("--install", "Install the dependency after writing cppkg.json")
    .option("-f, --force", "Replace an existing manifest dependency")
    .option("--no-cache", "Bypass cached archives when used with --install")
    .option("--http-proxy <url>", "HTTP request proxy, overrides config")
    .option("--https-proxy <url>", "HTTPS request proxy, overrides config")
    .option("--dry-run", "Log what would be added without writing to manifest")
    .option("--offline", "Only use cached archives, no network requests")
    .option("--no-transitive", "Skip resolution of transitive dependencies when installing")
    .option(
      "--workspace <package-name>",
      "Add dependency to a specific workspace member, or use 'all' for all members",
    )
    .action(async (source: string, options: AddOptions) => {
      if (options.workspace) {
        const workspace = resolveWorkspace();

        if (!workspace || !workspace.packages.length) {
          logger.warn(
            "No workspace configuration found. Create cppkg-workspace.json first.",
          );
          return;
        }

        const membersToUpdate = options.workspace === "all"
          ? workspace.packages
          : [workspace.packages.find((dir) => {
            const dirName = path.basename(dir);
            return dirName === options.workspace || dir === path.resolve(options.workspace!);
          })].filter((dir): dir is string => Boolean(dir));

        if (!membersToUpdate.length) {
          throw new Error(
            `Workspace member "${options.workspace}" not found in cppkg-workspace.json.`,
          );
        }

        const originalCwd = process.cwd();

        for (const memberDir of membersToUpdate) {
          const memberLabel = path.relative(originalCwd, memberDir) || memberDir;

          logger.info(`Adding dependency to workspace member: ${memberLabel}`);

          try {
            process.chdir(memberDir);
            const result = await addPackageManifestDependency(source, options);

            logger.success(
              `Added ${result.dependency.name} to cppkg.json in ${memberLabel}.`,
            );

            if (options.install) {
              await getVCPkg(
                result.dependency.source,
                getManifestDependencyOptions(result.dependency, options),
              );
            }
          } finally {
            process.chdir(originalCwd);
          }
        }

        return;
      }

      if (options.dryRun) {
        logger.info("Dry run: would add the following dependency to cppkg.json:");
        logger.detail(
          "source",
          source,
        );

        if (options.name) {
          logger.detail("name", options.name);
        }

        if (options.tag) {
          logger.detail("tag", options.tag);
        }

        if (options.branch) {
          logger.detail("branch", options.branch);
        }

        if (options.versionPolicy) {
          logger.detail("versionPolicy", options.versionPolicy);
        }

        if (options.prerelease) {
          logger.detail("prerelease", "true");
        }

        if (options.fullProject) {
          logger.detail("fullProject", "true");
        }

        if (options.includePath) {
          logger.detail("includePath", options.includePath);
        }

        if (options.stripPrefix) {
          logger.detail("stripPrefix", options.stripPrefix);
        }

        if (options.patches) {
          logger.detail("patches", options.patches);
        }

        if (options.components) {
          logger.detail("components", options.components);
        }

        if (options.checksum) {
          logger.detail("checksum", options.checksum);
        }

        return;
      }

      const result = await addPackageManifestDependency(source, options);

      logger.success(`Added ${result.dependency.name} to cppkg.json.`);

      if (!options.install) {
        return;
      }

      await getVCPkg(
        result.dependency.source,
        getManifestDependencyOptions(result.dependency, options),
      );
    });
}
