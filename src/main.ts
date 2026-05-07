#!/usr/bin/env node

import { createProgram } from "./program";
import { logger } from "./tools/logger";

/**
 * Bootstraps the CLI.
 */
async function main() {
  const program = createProgram();

  await program.parseAsync();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`cppkg-cli failed: ${message}`);
  process.exitCode = 1;
});
