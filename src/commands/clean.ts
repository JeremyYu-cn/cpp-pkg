import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { resolvePackageRootPath, resolvePublicIncludePath, resolveProjectsRootPath, resolveArchiveCachePath, getDepsFilePath } from "../public/packagePath";
import { getLockFilePath } from "../tools/lockfile";
import { logger } from "../tools/logger";

type CleanOptions = {
  all?: boolean;
  force?: boolean;
  dryRun?: boolean;
};

/**
 * Registers the command that cleans installed package data.
 */
export function registerCleanCommand(program: Command) {
  program
    .command("clean")
    .description("Remove installed packages, cache, and lockfile")
    .option("--all", "Remove all cppkg data including cpp_libs/ and lockfile")
    .option("-f, --force", "Skip confirmation prompt")
    .option("--dry-run", "Show what would be removed without deleting")
    .action((options: CleanOptions) => {
      const targets: { path: string; label: string }[] = [];

      targets.push(
        { path: resolvePublicIncludePath(), label: "Include directory" },
        { path: resolveProjectsRootPath(), label: "Projects directory" },
        { path: resolveArchiveCachePath(), label: "Archive cache" },
        { path: getDepsFilePath(), label: "Dependency metadata" },
      );

      if (options.all) {
        targets.push(
          { path: resolvePackageRootPath(), label: "Package root" },
          { path: getLockFilePath(), label: "Lockfile" },
        );
      }

      const existing = targets.filter((t) => fs.existsSync(t.path));

      if (!existing.length) {
        logger.warn("Nothing to clean.");
        return;
      }

      logger.info("The following will be removed:");
      for (const t of existing) {
        logger.detail(t.label, path.relative(process.cwd(), t.path) || ".");
      }

      if (options.dryRun) {
        logger.info("Dry-run complete. No files were removed.");
        return;
      }

      if (!options.force) {
        logger.warn('Use --force to confirm, or --dry-run to preview.');
        return;
      }

      let removed = 0;
      for (const t of existing) {
        try {
          fs.rmSync(t.path, { force: true, recursive: true });
          removed++;
        } catch (error: unknown) {
          logger.error(`Failed to remove ${t.label}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      logger.success(`Removed ${removed} of ${existing.length} item(s).`);
    });
}
