import { Command } from "commander";
import {
  addCompilerProfile,
  COMPILER_PROFILES_FILE_NAME,
  installCompilerProfile,
  listCompilerProfiles,
  removeCompilerProfile,
  resolveCompilerProfile,
  setDefaultCompilerProfile,
} from "../tools/toolchains";
import { logger } from "../tools/logger";

type CompilerAddOptions = {
  cmakeCompiler?: string;
  compilerVersion?: string;
  compiler?: string;
  docker?: boolean;
  dockerImage?: string;
  host?: boolean;
  kind?: string;
  setDefault?: boolean;
};

function getAddCompilerProfileOptions(options: CompilerAddOptions) {
  return {
    ...options,
    ...(options.compilerVersion ? { version: options.compilerVersion } : {}),
  };
}

type CompilerInstallOptions = {
  dockerImage?: string;
  dryRun?: boolean;
  setDefault?: boolean;
};

function formatProfileCompiler(profile: {
  cmakeCompiler?: string;
  compiler: string;
}) {
  return profile.cmakeCompiler && profile.cmakeCompiler !== profile.compiler
    ? `${profile.compiler} / CMake ${profile.cmakeCompiler}`
    : profile.compiler;
}

/**
 * Registers commands that manage reusable compiler profiles.
 */
export function registerCompilerCommand(program: Command) {
  const compiler = program
    .command("compiler")
    .alias("toolchain")
    .description("Manage compiler versions and Docker-backed compiler profiles");

  compiler
    .command("list")
    .description("List built-in and project compiler profiles")
    .action(async () => {
      const profiles = await listCompilerProfiles();

      logger.table(
        profiles.map((entry) => ({
          default: entry.default ? "yes" : "",
          image: entry.profile.dockerImage || "",
          kind: entry.profile.kind,
          name: entry.name,
          source: entry.source,
          version: entry.profile.version || "",
        })),
      );
    });

  compiler
    .command("current")
    .description("Show the current default compiler profile")
    .action(async () => {
      const resolved = await resolveCompilerProfile();

      if (!resolved) {
        logger.warn(`No default compiler profile set in ${COMPILER_PROFILES_FILE_NAME}.`);
        return;
      }

      logger.table([
        {
          compiler: formatProfileCompiler(resolved.profile),
          docker: resolved.profile.docker ? "yes" : "no",
          image: resolved.profile.dockerImage || "",
          kind: resolved.profile.kind,
          name: resolved.name,
          version: resolved.profile.version || "",
        },
      ]);
    });

  compiler
    .command("add")
    .description(`Add a project compiler profile to ${COMPILER_PROFILES_FILE_NAME}`)
    .argument("<name>", "Compiler profile name")
    .option("--kind <kind>", "Compiler kind: gcc, clang, or custom", "custom")
    .option("--compiler-version <version>", "Compiler version label")
    .option("--compiler <command>", "Compiler command inside the selected environment")
    .option(
      "--cmake-compiler <command>",
      "CMake C++ compiler command inside the selected environment",
    )
    .option("--docker", "Run this compiler profile through Docker")
    .option("--host", "Create a host compiler profile instead of a Docker profile")
    .option("--docker-image <image>", "Docker image for this compiler profile")
    .option("--set-default", "Set this profile as the default compiler profile")
    .action(async (name: string, options: CompilerAddOptions) => {
      const result = await addCompilerProfile(
        name,
        getAddCompilerProfileOptions(options),
      );

      logger.success(`Added compiler profile ${result.name}.`);

      if (options.setDefault) {
        logger.detail("Default", result.name);
      }
    });

  compiler
    .command("install")
    .description("Download a compiler profile Docker image")
    .argument("<name>", "Built-in or project compiler profile name")
    .option("--docker-image <image>", "Override the Docker image to pull")
    .option("--set-default", "Set this profile as the default after pulling")
    .option("--dry-run", "Print the docker pull command without executing it")
    .action(async (name: string, options: CompilerInstallOptions) => {
      const result = await installCompilerProfile(name, options);

      if (options.dryRun) {
        return;
      }

      logger.success(`Installed compiler image ${result.dockerImage}.`);

      if (options.setDefault) {
        logger.detail("Default", result.name);
      }
    });

  compiler
    .command("use")
    .description("Set the default compiler profile")
    .argument("<name>", "Built-in or project compiler profile name")
    .action(async (name: string) => {
      const result = await setDefaultCompilerProfile(name);

      logger.success(`Using compiler profile ${result.name}.`);
    });

  compiler
    .command("remove")
    .description("Remove a project compiler profile")
    .argument("<name>", "Project compiler profile name")
    .action(async (name: string) => {
      const result = await removeCompilerProfile(name);

      logger.success(`Removed compiler profile ${result.name}.`);
    });
}
