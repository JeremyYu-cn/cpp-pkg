import { Command } from "commander";
import { collectOption } from "./options";
import {
  compileSources,
  DEFAULT_CPP_COMPILER,
  DEFAULT_CPP_STANDARD,
} from "../tools/compiler";

type CompileOptions = {
  compiler?: string;
  compilerArg?: string[];
  docker?: boolean;
  dockerImage?: string;
  dryRun?: boolean;
  includeDir?: string[];
  output?: string;
  std?: string;
  toolchain?: string;
};

/**
 * Registers the simple compiler wrapper for projects that do not use CMake.
 */
export function registerCompileCommand(program: Command) {
  program
    .command("compile")
    .description("Compile C/C++ source files with cppkg include paths")
    .argument("<files...>", "C/C++ source files to compile")
    .option(
      "--compiler <command>",
      `Compiler command (default: ${DEFAULT_CPP_COMPILER})`,
    )
    .option("--toolchain <name>", "Compiler profile from cppkg-toolchains.json")
    .option("--std <standard>", "C++ language standard", DEFAULT_CPP_STANDARD)
    .option("-o, --output <path>", "Output binary path", "a.out")
    .option(
      "-I, --include-dir <path>",
      "Additional include directory; may be repeated",
      collectOption,
    )
    .option(
      "--compiler-arg <arg>",
      "Additional compiler or linker argument; may be repeated",
      collectOption,
    )
    .option("--docker", "Run the compiler inside Docker")
    .option(
      "--docker-image <image>",
      "Docker image to use with --docker",
    )
    .option("--dry-run", "Print the compiler command without executing it")
    .action(async (files: string[], options: CompileOptions) => {
      await compileSources(files, options);
    });
}
