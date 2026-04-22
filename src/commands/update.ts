import { Command } from "commander";
import { updateInstalledPackages } from "../tools/manage";

/**
 * Registers the command that refreshes one tracked package or all of them.
 */
export function registerUpdateCommand(program: Command) {
  program
    .command("update")
    .description(
      "Update one installed package, or all tracked packages when no selector is provided",
    )
    .argument(
      "[package]",
      "Installed package name, repository path, owner/repo, or GitHub repository URL",
    )
    .option("--http-proxy <url>", "HTTP request proxy")
    .option("--https-proxy <url>", "HTTPS request proxy")
    .action(async (selector, options) => {
      const result = await updateInstalledPackages(selector, options);

      if (!result.updatedDependencies.length) {
        return;
      }

      console.log(`Updated ${result.updatedDependencies.length} package(s).`);
    });
}
