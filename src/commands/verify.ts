import { Command } from "commander";
import { verifyPackages } from "../tools/verify";
import { logger } from "../tools/logger";

export function registerVerifyCommand(program: Command) {
  program
    .command("verify")
    .description("Verify installed packages checksums against lockfile")
    .action(async () => {
      const result = await verifyPackages();

      if (!result.verified) {
        logger.warn("No packages to verify. Run cppkg-cli install first.");
        return;
      }

      logger.info(`Verified ${result.verified} package(s), ${result.passed} passed.`);

      if (result.issues.length) {
        logger.table(
          result.issues.map((issue) => ({
            severity: issue.severity,
            code: issue.code,
            package: issue.packageName,
            message: issue.message,
          })),
        );
        process.exitCode = 1;
      } else {
        logger.success("All packages verified successfully.");
      }
    });
}
