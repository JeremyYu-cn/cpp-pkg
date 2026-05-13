import { Command } from "commander";
import { createProject, type CreateOptions } from "../tools/create";

/**
 * Registers the command that scaffolds a new C/C++ library project.
 */
export function registerCreateCommand(program: Command) {
  program
    .command("create")
    .description("Scaffold a new C/C++ library project")
    .argument("<name>", "Name of the new project")
    .option("--header-only", "Create a header-only library (skip src/ and CMake)")
    .option("--c", "Create a C project instead of C++")
    .option("--output <dir>", "Custom output directory")
    .action(async (name: string, options: CreateOptions) => {
      await createProject(name, options);
    });
}
