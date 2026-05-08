import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { registerAddCommand } from "./commands/add";
import { registerBuildCommand } from "./commands/build";
import { registerCacheCommand } from "./commands/cache";
import { registerCMakeCommand } from "./commands/cmake";
import { registerCompileCommand } from "./commands/compile";
import { registerCompilerCommand } from "./commands/compiler";
import { registerConfigCommand } from "./commands/config";
import { registerGetCommand } from "./commands/get";
import { registerInitCommand } from "./commands/init";
import { registerInstallCommand } from "./commands/install";
import { registerInspectCommand } from "./commands/inspect";
import { registerListCommand } from "./commands/list";
import { registerRemoveCommand } from "./commands/remove";
import { registerSearchCommand } from "./commands/search";
import { registerServerCommand } from "./commands/server";
import { registerStatusCommand } from "./commands/status";
import { registerUpdateCommand } from "./commands/update";

export function getPackageVersion() {
  const packageJsonPath = path.resolve(__dirname, "../package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    version?: unknown;
  };

  return typeof packageJson.version === "string" && packageJson.version.trim()
    ? packageJson.version
    : "0.0.0";
}

/**
 * Creates the CLI program with every supported command registered.
 */
export function createProgram(version = getPackageVersion()) {
  const program = new Command();

  program
    .name("cppkg-cli")
    .description(
      "Download C/C++ packages into a shared include directory or project workspace",
    )
    .version(version);

  registerAddCommand(program);
  registerGetCommand(program);
  registerInitCommand(program);
  registerCompileCommand(program);
  registerBuildCommand(program);
  registerCompilerCommand(program);
  registerInstallCommand(program);
  registerInspectCommand(program);
  registerListCommand(program);
  registerRemoveCommand(program);
  registerSearchCommand(program);
  registerServerCommand(program);
  registerStatusCommand(program);
  registerUpdateCommand(program);
  registerCacheCommand(program);
  registerCMakeCommand(program);
  registerConfigCommand(program);

  return program;
}
