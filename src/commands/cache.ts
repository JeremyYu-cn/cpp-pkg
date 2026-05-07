import { Command } from "commander";
import path from "node:path";
import { resolveArchiveCachePath } from "../public/packagePath";
import {
  cleanArchiveCache,
  formatBytes,
  listArchiveCacheEntries,
} from "../tools/cache";
import { logger } from "../tools/logger";

type CacheCleanOptions = {
  olderThan?: string;
};

function parseOlderThanDays(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const days = Number(value.trim());

  if (!Number.isFinite(days) || days < 0) {
    throw new Error("Option --older-than must be a non-negative number of days.");
  }

  return days;
}

/**
 * Registers commands that inspect and clear the downloaded archive cache.
 */
export function registerCacheCommand(program: Command) {
  const cache = program
    .command("cache")
    .description("Manage downloaded archive cache");

  cache
    .command("list")
    .description("List cached downloaded archives")
    .action(async () => {
      const entries = await listArchiveCacheEntries();

      if (!entries.length) {
        logger.warn(`No cached archives found in ${resolveArchiveCachePath()}.`);
        return;
      }

      logger.table(
        entries.map((entry) => ({
          modified: entry.modifiedAt.toISOString(),
          name: entry.name,
          path: path.relative(process.cwd(), entry.path) || entry.path,
          size: formatBytes(entry.size),
        })),
      );
    });

  cache
    .command("clean")
    .description("Remove cached downloaded archives")
    .option(
      "--older-than <days>",
      "Only remove cache entries at least this many days old",
    )
    .action(async (options: CacheCleanOptions) => {
      const olderThanDays = parseOlderThanDays(options.olderThan);
      const result = await cleanArchiveCache(
        olderThanDays === undefined ? {} : { olderThanDays },
      );

      if (!result.removedEntries.length) {
        logger.warn("No cached archives matched the clean criteria.");
        return;
      }

      logger.success(
        `Removed ${result.removedEntries.length} cached archive(s), freeing ${formatBytes(result.totalBytes)}.`,
      );
    });
}
