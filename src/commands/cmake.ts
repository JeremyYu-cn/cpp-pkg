import { Command } from "commander";
import path from "node:path";
import {
  CMAKE_INTEGRATION_FILE_NAME,
  generateCMakeIntegration,
} from "../tools/cmake";
import { logger } from "../tools/logger";

type CMakeOptions = {
  force?: boolean;
  output?: string;
};

/**
 * Registers the command that writes the CMake integration helper.
 */
export function registerCMakeCommand(program: Command) {
  program
    .command("cmake")
    .description(`Generate a ${CMAKE_INTEGRATION_FILE_NAME} integration helper`)
    .option("-o, --output <path>", "Project-relative output path")
    .option("-f, --force", `Overwrite an existing ${CMAKE_INTEGRATION_FILE_NAME}`)
    .action((options: CMakeOptions) => {
      const result = generateCMakeIntegration(options);
      const outputPath =
        path.relative(process.cwd(), result.outputPath) || CMAKE_INTEGRATION_FILE_NAME;

      logger.success(`Created ${outputPath}.`);
      logger.detail(
        "Next",
        `include(${outputPath}) and link targets with cppkg::headers`,
      );
    });
}
