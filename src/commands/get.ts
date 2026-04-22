import { Command } from "commander";
import { getVCPkg } from "../tools/download";

/**
 * Registers the package download command on the root CLI program.
 */
export function registerGetCommand(program: Command) {
  program
    .command("get")
    .description(
      "Download the latest GitHub release headers into ./cpp_libs/include",
    )
    .argument(
      "<repo-url>",
      "GitHub repository URL, for example https://github.com/nlohmann/json",
    )
    .option("--http-proxy <url>", "HTTP request proxy")
    .option("--https-proxy <url>", "HTTPS request proxy")
    .action(async (repoURL, options) => {
      await getVCPkg(repoURL, options);
    });
}
