import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { generateCMakeIntegration } from "../cmake";
import { dockerizeCommand } from "./docker";
import {
  getCMakeStandard,
  normalizeCommand,
  normalizeStringOption,
  normalizeStringList,
  toProjectPath,
} from "./paths";
import { runPlannedCommands } from "./runner";
import { applyBuildToolchain } from "./toolchain";
import {
  DEFAULT_DOCKER_WORKDIR,
  type BuildCMakeProjectOptions,
  type ProjectPathMode,
} from "./types";

function getBuildConfig(options: BuildCMakeProjectOptions) {
  return normalizeCommand(
    options.config,
    options.release ? "Release" : "Debug",
    "Option --config",
  );
}

function getCMakeBuildDir(
  options: BuildCMakeProjectOptions,
  mode: ProjectPathMode,
) {
  return toProjectPath(options.buildDir || "build", "build directory", mode);
}

function getCMakeIntegrationPath(mode: ProjectPathMode) {
  return toProjectPath("cppkg.cmake", "cppkg.cmake path", mode);
}

export function planCMakeBuild(
  options: BuildCMakeProjectOptions = {},
) {
  const mode: ProjectPathMode = options.docker ? "container" : "host";
  const buildDir = getCMakeBuildDir(options, mode);
  const config = getBuildConfig(options);
  const configureArgs = [
    "-S",
    mode === "container" ? DEFAULT_DOCKER_WORKDIR : ".",
    "-B",
    buildDir,
    `-DCMAKE_BUILD_TYPE=${config}`,
  ];
  const buildArgs = [
    "--build",
    buildDir,
    "--config",
    config,
  ];
  const cmakeStandard = getCMakeStandard(options.std);

  if (options.cppkgCmake !== false) {
    configureArgs.push(
      "-DCPPKG_GLOBAL_INCLUDE_DIRECTORIES=ON",
      `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=${getCMakeIntegrationPath(mode)}`,
    );
  }

  if (options.compiler) {
    configureArgs.push(`-DCMAKE_CXX_COMPILER=${options.compiler}`);
  }

  if (cmakeStandard) {
    configureArgs.push(
      `-DCMAKE_CXX_STANDARD=${cmakeStandard}`,
      "-DCMAKE_CXX_STANDARD_REQUIRED=ON",
    );
  }

  if (options.generator) {
    configureArgs.push(
      "-G",
      normalizeStringOption(options.generator, "Option --generator")!,
    );
  }

  configureArgs.push(...normalizeStringList(options.cmakeArg, "CMake argument"));

  if (options.target) {
    buildArgs.push(
      "--target",
      normalizeStringOption(options.target, "Option --target")!,
    );
  }

  buildArgs.push(...normalizeStringList(options.buildArg, "build argument"));

  return [
    dockerizeCommand("cmake", configureArgs, options),
    dockerizeCommand("cmake", buildArgs, options),
  ];
}

async function ensureCMakeProject() {
  const cmakeListsPath = path.resolve(process.cwd(), "CMakeLists.txt");

  try {
    const stat = await fsp.stat(cmakeListsPath);

    if (stat.isFile()) {
      return;
    }
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== "ENOENT") {
      throw error;
    }
  }

  throw new Error("Cannot find CMakeLists.txt in the current project.");
}

async function ensureCMakeIntegration(options: BuildCMakeProjectOptions) {
  if (options.cppkgCmake === false || options.dryRun) {
    return;
  }

  const cmakePath = path.resolve(process.cwd(), "cppkg.cmake");

  if (!fs.existsSync(cmakePath)) {
    generateCMakeIntegration();
  }
}

export async function buildCMakeProject(
  options: BuildCMakeProjectOptions = {},
) {
  const resolvedOptions = await applyBuildToolchain(options);
  const commands = planCMakeBuild(resolvedOptions);

  if (!resolvedOptions.dryRun) {
    await ensureCMakeProject();
    await ensureCMakeIntegration(resolvedOptions);
  }

  await runPlannedCommands(commands, resolvedOptions);

  return commands;
}
