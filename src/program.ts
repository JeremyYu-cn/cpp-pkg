import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { registerAddCommand } from "./commands/add";
import { registerAuditCommand } from "./commands/audit";
import { registerBuildCommand } from "./commands/build";
import { registerCacheCommand } from "./commands/cache";
import { registerCMakeCommand } from "./commands/cmake";
import { registerCompileCommand } from "./commands/compile";
import { registerCompilerCommand } from "./commands/compiler";
import { registerConfigCommand } from "./commands/config";
import { registerCreateCommand } from "./commands/create";
import { registerGetCommand } from "./commands/get";
import { registerImportCommand } from "./commands/import";
import { registerInitCommand } from "./commands/init";
import { registerInstallCommand } from "./commands/install";
import { registerInspectCommand } from "./commands/inspect";
import { registerIntegrateCommand } from "./commands/integrate";
import { registerListCommand } from "./commands/list";
import { registerPublishCommand } from "./commands/publish";
import { registerRemoveCommand } from "./commands/remove";
import { registerSearchCommand } from "./commands/search";
import { registerServerCommand } from "./commands/server";
import { registerStatusCommand } from "./commands/status";
import { registerUpdateCommand } from "./commands/update";
import { registerVendorCommand } from "./commands/vendor";
import { registerWhyCommand } from "./commands/why";

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
  registerAuditCommand(program);
  registerGetCommand(program);
  registerImportCommand(program);
  registerInitCommand(program);
  registerCompileCommand(program);
  registerBuildCommand(program);
  registerCompilerCommand(program);
  registerCreateCommand(program);
  registerInstallCommand(program);
  registerIntegrateCommand(program);
  registerInspectCommand(program);
  registerListCommand(program);
  registerPublishCommand(program);
  registerRemoveCommand(program);
  registerSearchCommand(program);
  registerServerCommand(program);
  registerStatusCommand(program);
  registerUpdateCommand(program);
  registerVendorCommand(program);
  registerCacheCommand(program);
  registerCMakeCommand(program);
  registerConfigCommand(program);
  registerWhyCommand(program);

  return program;
}
