import { Command } from "commander";
import { collectOption } from "./options";
import {
  buildCMakeProject,
  DEFAULT_CPP_STANDARD,
} from "../tools/compiler";

type BuildOptions = {
  buildArg?: string[];
  buildDir?: string;
  cmakeArg?: string[];
  compiler?: string;
  config?: string;
  cppkgCmake?: boolean;
  docker?: boolean;
  dockerImage?: string;
  dryRun?: boolean;
  generator?: string;
  release?: boolean;
  std?: string;
  target?: string;
  toolchain?: string;
};

/**
 * Registers the CMake build wrapper.
 */
export function registerBuildCommand(program: Command) {
  program
    .command("build")
    .description("Configure and build a CMake project with cppkg include paths")
    .option("--build-dir <path>", "CMake build directory", "build")
    .option("--compiler <command>", "C++ compiler command for CMake")
    .option("--toolchain <name>", "Compiler profile from cppkg-toolchains.json")
    .option("--std <standard>", "C++ language standard", DEFAULT_CPP_STANDARD)
    .option("--release", "Use Release build configuration")
    .option("--config <name>", "CMake build configuration")
    .option("--target <target>", "CMake target to build")
    .option("--generator <name>", "CMake generator name")
    .option(
      "--cmake-arg <arg>",
      "Additional CMake configure argument; may be repeated",
      collectOption,
    )
    .option(
      "--build-arg <arg>",
      "Additional CMake build argument; may be repeated",
      collectOption,
    )
    .option(
      "--no-cppkg-cmake",
      "Do not generate or inject cppkg.cmake during configure",
    )
    .option("--docker", "Run CMake configure and build inside Docker")
    .option(
      "--docker-image <image>",
      "Docker image to use with --docker",
    )
    .option("--dry-run", "Print CMake command(s) without executing them")
    .action(async (options: BuildOptions) => {
      await buildCMakeProject(options);
    });
}
