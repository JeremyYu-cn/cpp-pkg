import { Command } from "commander";
import path from "node:path";
import {
  generateCppkgCmake,
  integrateCppkg,
  CPPKG_CMAKE_FILE_NAME,
} from "../tools/integrate";
import { logger } from "../tools/logger";

type IntegrateOptions = {
  dryRun?: boolean;
  target?: string;
};

/**
 * Registers the integrate command that modifies CMakeLists.txt for cppkg auto-integration.
 */
export function registerIntegrateCommand(program: Command) {
  program
    .command("integrate")
    .description("Modify CMakeLists.txt to auto-include cppkg headers and projects")
    .option("--dry-run", "Show what would be changed without writing")
    .option("--target <name>", "Integrate only for a specific CMake target")
    .action((options: IntegrateOptions) => {
      const result = integrateCppkg(options);

      if (options.dryRun) {
        logger.info(`Dry run: would modify ${path.relative(process.cwd(), result.cmakePath) || "CMakeLists.txt"}:`);

        for (const line of result.added) {
          logger.detail("would add", line);
        }

        if (!result.added.length) {
          logger.info("No changes needed. cppkg integration already present.");
        }

        return;
      }

      if (result.created) {
        logger.success(
          `Created ${path.relative(process.cwd(), result.cmakePath) || "CMakeLists.txt"} with cppkg integration.`,
        );
      } else if (result.added.length) {
        logger.success(
          `Updated ${path.relative(process.cwd(), result.cmakePath) || "CMakeLists.txt"} with cppkg integration.`,
        );
      } else {
        logger.info("cppkg integration already present in CMakeLists.txt.");
      }

      logger.detail(
        "Tip",
        `Run "cppkg-cli cmake" to generate ${CPPKG_CMAKE_FILE_NAME} for advanced usage.`,
      );
    });
}
