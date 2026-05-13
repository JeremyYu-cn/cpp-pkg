import { Command } from "commander";
import { auditPackages, type AuditOptions, type SeverityLevel } from "../tools/audit";

/**
 * Registers the command that audits installed packages against the GitHub Advisory Database.
 */
export function registerAuditCommand(program: Command) {
  program
    .command("audit")
    .description("Check installed packages against known vulnerabilities")
    .option(
      "--level <severity>",
      "Filter advisories by minimum severity (low, medium, high, critical)",
    )
    .option("--fix", "Suggest updates for packages with vulnerabilities")
    .action(async (options: { level?: string; fix?: boolean }) => {
      const auditOptions: AuditOptions = {};

      if (options.level) {
        const level = options.level.toLowerCase();

        if (
          level !== "low" &&
          level !== "medium" &&
          level !== "high" &&
          level !== "critical"
        ) {
          throw new Error(
            `Invalid severity level: ${options.level}. Use low, medium, high, or critical.`,
          );
        }

        auditOptions.level = level as SeverityLevel;
      }

      if (options.fix) {
        auditOptions.fix = true;
      }

      await auditPackages(auditOptions);
    });
}
