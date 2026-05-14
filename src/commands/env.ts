import { Command } from "commander";
import { getSystemDiagnostics } from "../tools/env";
import { logger } from "../tools/logger";

export function registerEnvCommand(program: Command) {
  program
    .command("env")
    .description("Show system environment diagnostics")
    .action(async () => {
      const diag = getSystemDiagnostics();
      logger.info("System Environment Diagnostics:");
      for (const d of diag) {
        logger.detail(d.key, d.value);
      }
    });
}
