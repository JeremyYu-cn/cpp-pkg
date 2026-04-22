#!/usr/bin/env node

import { Command } from "commander";
import { registerGetCommand } from "./commands/get";
import { registerListCommand } from "./commands/list";
import { registerRemoveCommand } from "./commands/remove";
import { registerUpdateCommand } from "./commands/update";

/**
 * Bootstraps the CLI and registers all supported commands.
 */
async function main() {
  const program = new Command();

  program
    .name("cppkg-cli")
    .description(
      "Download header-only C/C++ packages into a shared include directory",
    )
    .version("0.0.2");

  registerGetCommand(program);
  registerListCommand(program);
  registerRemoveCommand(program);
  registerUpdateCommand(program);

  await program.parseAsync();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`cppkg-cli failed: ${message}`);
  process.exitCode = 1;
});
