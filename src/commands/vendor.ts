import { Command } from "commander";
import { vendorPackages, type VendorOptions } from "../tools/manage/vendor";

/**
 * Registers the command that vendors installed packages into a project-local directory.
 */
export function registerVendorCommand(program: Command) {
  program
    .command("vendor")
    .description("Copy installed packages from cpp_libs/ into a vendor/ directory")
    .option(
      "--remove-originals",
      "Delete the cpp_libs/ directory after vendoring",
    )
    .option(
      "--output <dir>",
      "Custom output directory (defaults to vendor/)",
    )
    .action(async (options: VendorOptions) => {
      await vendorPackages(options);
    });
}
