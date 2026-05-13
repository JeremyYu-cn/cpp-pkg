import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import {
  createPackageManifest,
  MANIFEST_FILE_NAME,
} from "../public/manifest";
import { resolvePackageRootPath } from "../public/packagePath";
import { logger } from "../tools/logger";
import { createWorkspaceConfig, WORKSPACE_FILE_NAME } from "../tools/workspace";

type InitOptions = {
  force?: boolean;
  noGitignore?: boolean;
  workspace?: boolean;
};

/**
 * Registers the command that creates a project package manifest.
 */
export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description(`Create a ${MANIFEST_FILE_NAME} package manifest`)
    .option("-f, --force", `Overwrite an existing ${MANIFEST_FILE_NAME}`)
    .option("--no-gitignore", "Skip .gitignore creation or modification")
    .option(
      "--workspace",
      `Create a ${WORKSPACE_FILE_NAME} workspace configuration`,
    )
    .action((options: InitOptions) => {
      const result = createPackageManifest({
        force: Boolean(options.force),
      });
      const manifestPath =
        path.relative(process.cwd(), result.manifestFilePath) ||
        MANIFEST_FILE_NAME;

      logger.success(`Created ${manifestPath}.`);
      logger.detail(
        "Next",
        `Add dependencies, then run cppkg-cli install`,
      );

      if (options.workspace) {
        try {
          const workspaceResult = createWorkspaceConfig([]);
          const workspacePath =
            path.relative(process.cwd(), workspaceResult.configPath) ||
            WORKSPACE_FILE_NAME;

          logger.success(`Created ${workspacePath}.`);
          logger.detail(
            "Workspace",
            `Add member directories to the "packages" array in ${WORKSPACE_FILE_NAME}`,
          );
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);

          if (message.includes("already exists")) {
            logger.warn(`${WORKSPACE_FILE_NAME} already exists.`);
          } else {
            throw error;
          }
        }
      }

      if (options.noGitignore) {
        return;
      }

      const gitignorePath = path.join(process.cwd(), ".gitignore");
      const packageRootPath = resolvePackageRootPath();
      const packageRootRelative = path.relative(process.cwd(), packageRootPath).replace(/\\/g, "/").replace(/\/+$/, "");
      const gitignoreEntry = `\n# cppkg packages\n${packageRootRelative}/\n`;
      const workspaceGitignoreEntry = `\n# cppkg workspace lock\n${path.basename(process.cwd())}.workspace-lock.json\n`;

      if (fs.existsSync(gitignorePath)) {
        const existing = fs.readFileSync(gitignorePath, "utf8");

        if (!existing.includes(`${packageRootRelative}/`)) {
          if (!existing.endsWith("\n")) {
            fs.appendFileSync(gitignorePath, `\n${gitignoreEntry}`);
          } else {
            fs.appendFileSync(gitignorePath, gitignoreEntry);
          }
          logger.success(`Added ${packageRootRelative}/ to .gitignore`);
        }
      } else {
        fs.writeFileSync(gitignorePath, `# cppkg packages\n${packageRootRelative}/\n`, "utf8");
        logger.success(`Created .gitignore with ${packageRootRelative}/`);
      }
    });
}
