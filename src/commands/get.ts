import { Command } from "commander";
import { getVCPkg } from "../tools/download";

/**
 * Registers the package download command on the root CLI program.
 */
export function registerGetCommand(program: Command) {
  program
    .command("get")
    .description(
      "Download headers or the full GitHub project into the local cpp_libs directory",
    )
    .argument(
      "<repo-url>",
      "GitHub repository URL or API repository URL, for example https://github.com/nlohmann/json or https://api.github.com/repos/espruino/Espruino",
    )
    .option("--full-project", "Download and extract the whole project source tree")
    .option("--http-proxy <url>", "HTTP request proxy")
    .option("--https-proxy <url>", "HTTPS request proxy")
    .action(async (repoURL, options) => {
      await getVCPkg(repoURL, options);
    });
}
