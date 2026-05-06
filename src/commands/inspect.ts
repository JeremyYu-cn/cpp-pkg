import { Command } from "commander";
import { inspectProjectPackages } from "../tools/inspect";
import { logger } from "../tools/logger";

/**
 * Registers the command that inspects project source includes and package needs.
 */
export function registerInspectCommand(program: Command) {
  program
    .command("inspect")
    .description("Inspect C/C++ source includes and report package needs")
    .action(async () => {
      const inspection = await inspectProjectPackages();

      if (!inspection.filesScanned) {
        logger.warn("No C/C++ source files found in this project.");
        return;
      }

      logger.info(
        `Inspected ${inspection.filesScanned} C/C++ file(s) and ${inspection.includeCount} include directive(s).`,
      );

      if (!inspection.packages.length) {
        logger.success("No external package includes found.");
        return;
      }

      logger.table(
        inspection.packages.map((dependency) => ({
          package: dependency.name,
          status: dependency.status,
          includes: dependency.includes.join(", "),
          usedBy: dependency.usages
            .map((usage) => `${usage.filePath}:${usage.line}`)
            .join(", "),
        })),
      );

      const missingPackages = inspection.packages.filter(
        (dependency) => dependency.status === "missing",
      );

      if (missingPackages.length) {
        logger.warn(
          `Found ${missingPackages.length} missing package candidate(s).`,
        );
      } else {
        logger.success("All detected package includes are installed or declared.");
      }
    });
}
