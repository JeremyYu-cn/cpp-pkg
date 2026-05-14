import { Command } from "commander";
import { execSync } from "node:child_process";
import { checkSelfUpdate } from "../tools/selfUpdate";
import { logger } from "../tools/logger";

type SelfUpdateOptions = {
  install?: boolean;
};

export function registerSelfUpdateCommand(program: Command) {
  program
    .command("self-update")
    .description("Check for a newer version of cppkg-cli")
    .option("--install", "Automatically install the latest version")
    .action(async (options: SelfUpdateOptions) => {
      const result = await checkSelfUpdate();

      logger.detail("Current version", result.currentVersion);

      if (result.error) {
        logger.warn(`Could not check for updates: ${result.error}`);
        return;
      }

      if (result.latestVersion) {
        logger.detail("Latest version", result.latestVersion);
      }

      if (!result.outdated) {
        logger.success("cppkg-cli is up to date.");
        return;
      }

      logger.info(`A newer version is available: ${result.currentVersion} -> ${result.latestVersion}`);

      if (options.install) {
        logger.progress("Installing latest version...");
        try {
          execSync("npm install -g cppkg-cli@latest", {
            stdio: "inherit",
            timeout: 60000,
          });
          logger.success("Updated to latest version.");
        } catch {
          logger.error("Failed to install the latest version. Try: npm install -g cppkg-cli@latest");
        }
      } else {
        logger.info('Run "cppkg-cli self-update --install" to upgrade.');
      }
    });
}
