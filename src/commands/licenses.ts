import { Command } from "commander";
import path from "node:path";
import { scanLicenses } from "../tools/licenses";
import { logger } from "../tools/logger";

type LicensesOptions = {
  full?: boolean;
};

export function registerLicensesCommand(program: Command) {
  program
    .command("licenses")
    .description("Scan installed packages for open-source licenses")
    .option("--full", "Show full license text")
    .action(async (options: LicensesOptions) => {
      const licenses = await scanLicenses();

      if (!licenses.length) {
        logger.warn("No installed packages found.");
        return;
      }

      logger.table(
        licenses.map((l) => ({
          package: l.packageName,
          version: l.version,
          license: l.licenseFile ? path.relative(process.cwd(), l.licenseFile) : "not found",
          repository: l.repository,
        })),
      );

      if (options.full) {
        for (const l of licenses) {
          if (l.licenseContent) {
            logger.raw("");
            logger.info(`License for ${l.packageName}:`);
            logger.raw(l.licenseContent);
          }
        }
      }

      logger.info(`Total: ${licenses.length} package(s)`);
    });
}
