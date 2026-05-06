import { Command } from "commander";
import type { GetPkgOptions } from "../types/global";
import { collectOption } from "./options";
import { getVCPkg } from "../tools/download/main";
import {
  getRejectedPackageDownloadTasks,
  normalizePackageDownloadJobs,
  runPackageDownloadTasks,
} from "../tools/download/tasks";
import { getErrorMessage } from "../tools/errors";
import { logger } from "../tools/logger";

/**
 * Registers the package download command on the root CLI program.
 */
export function registerGetCommand(program: Command) {
  program
    .command("get")
    .description(
      "Download GitHub repositories or remote zip archives into the configured package directory",
    )
    .argument(
      "<repo-urls...>",
      "One or more GitHub repository URLs, GitHub API repository URLs, Gitee repository URLs, or direct zip archive URLs separated by spaces",
    )
    .option(
      "--full-project",
      "Install the package as a full project and skip include-directory detection",
    )
    .option("--tag <tag>", "Install a specific release tag or repository tag")
    .option("--branch <branch>", "Install a specific repository branch")
    .option(
      "--prerelease",
      "Allow prerelease versions when selecting the latest release",
    )
    .option("--no-cache", "Bypass cached archives and refresh downloads")
    .option(
      "--include-path <path>",
      "Archive-relative include directory to install; may be repeated",
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
    .option("--http-proxy <url>", "HTTP request proxy, overrides config")
    .option("--https-proxy <url>", "HTTPS request proxy, overrides config")
    .action(async (repoURLs: string[], options: GetPkgOptions) => {
      const taskJobs = normalizePackageDownloadJobs(undefined, repoURLs.length);

      if (repoURLs.length === 1) {
        await getVCPkg(repoURLs[0]!, options);
        return;
      }

      logger.info(`Installing ${repoURLs.length} package(s).`);

      const results = await runPackageDownloadTasks(
        repoURLs.map((repoURL) => ({
          item: repoURL,
          label: repoURL,
          run: () => getVCPkg(repoURL, options),
        })),
        { jobs: taskJobs },
      );
      const failures = getRejectedPackageDownloadTasks(results);

      if (!failures.length) {
        logger.success(`Installed ${repoURLs.length} package(s).`);
        return;
      }

      const installedCount = repoURLs.length - failures.length;

      if (installedCount > 0) {
        logger.warn(`Installed ${installedCount} of ${repoURLs.length} package(s).`);
      }

      for (const failure of failures) {
        logger.error(
          `Failed to install ${failure.item}: ${getErrorMessage(failure.reason)}`,
        );
      }

      throw new Error(
        `Failed to install ${failures.length} of ${repoURLs.length} package(s).`,
      );
    });
}
