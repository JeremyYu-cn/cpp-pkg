import { spawn } from "node:child_process";
import { logger } from "../logger";
import type {
  CompilerEnvironmentOptions,
  PlannedCommand,
} from "./types";

function quoteCommandArg(value: string) {
  if (!value) {
    return "''";
  }

  if (/^[A-Za-z0-9_./:=@%+-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function formatPlannedCommand(command: PlannedCommand) {
  return [command.command, ...command.args].map(quoteCommandArg).join(" ");
}

export async function runPlannedCommands(
  commands: PlannedCommand[],
  options: CompilerEnvironmentOptions,
) {
  if (options.dryRun) {
    logger.info("Dry run; command(s) were not executed.");

    for (const command of commands) {
      logger.raw(formatPlannedCommand(command));
    }

    return;
  }

  for (const command of commands) {
    logger.info(`Running ${formatPlannedCommand(command)}`);

    await new Promise<void>((resolve, reject) => {
      const child = spawn(command.command, command.args, {
        cwd: command.cwd,
        stdio: "inherit",
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`${command.command} exited with code ${code}`));
      });
    });
  }
}
