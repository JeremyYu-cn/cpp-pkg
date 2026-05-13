import type { InstalledDependency } from "../../types/global";
import { promises as fsp } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { readInstalledDependencies } from "../deps";
import { resolvePackageRootPath, resolvePublicIncludePath, resolveProjectsRootPath } from "../../public/packagePath";
import { logger } from "../logger";

export type VendorOptions = {
  removeOriginals?: boolean;
  output?: string;
};

async function copyDir(src: string, dest: string) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const linkTarget = await fsp.readlink(srcPath);
      await fsp.symlink(linkTarget, destPath);
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

function getIncludeSourcePath(dependency: InstalledDependency) {
  const headers =
    dependency.install.headers.length > 0
      ? dependency.install.headers
      : dependency.install.paths;

  return { headers };
}

function getProjectSourcePath(dependency: InstalledDependency) {
  const paths = dependency.install.paths;
  return { paths };
}

/**
 * Copies all installed packages from cpp_libs/ into a vendor/ directory.
 */
export async function vendorPackages(options: VendorOptions = {}) {
  const installed = await readInstalledDependencies();

  if (!installed.dependencies.length) {
    logger.warn("No installed packages found to vendor.");
    return { copied: 0 };
  }

  const outputDir = options.output
    ? path.resolve(process.cwd(), options.output)
    : path.resolve(process.cwd(), "vendor");
  const includeDir = path.join(outputDir, "include");
  const projectsDir = path.join(outputDir, "projects");

  await fsp.mkdir(includeDir, { recursive: true });
  await fsp.mkdir(projectsDir, { recursive: true });

  let copiedCount = 0;

  for (const dependency of installed.dependencies) {
    const installMode = dependency.install.mode;

    if (installMode === "include") {
      const { headers } = getIncludeSourcePath(dependency);

      for (const header of headers) {
        const srcPath = path.join(resolvePublicIncludePath(), header);

        if (!fs.existsSync(srcPath)) {
          logger.warn(
            `Source path not found for ${dependency.name}: ${srcPath}`,
          );
          continue;
        }

        const destPath = path.join(includeDir, header);
        await copyDir(srcPath, destPath);
        logger.info(`Vendored include ${dependency.name}: ${header}`);
        copiedCount += 1;
      }
    } else {
      const { paths: installPaths } =
        getProjectSourcePath(dependency);

      for (const installPath of installPaths) {
        const srcPath = path.join(resolveProjectsRootPath(), installPath);

        if (!fs.existsSync(srcPath)) {
          logger.warn(
            `Source path not found for ${dependency.name}: ${srcPath}`,
          );
          continue;
        }

        const destPath = path.join(projectsDir, installPath);
        await copyDir(srcPath, destPath);
        logger.info(`Vendored project ${dependency.name}: ${installPath}`);
        copiedCount += 1;
      }
    }
  }

  const gitignorePath = path.join(outputDir, ".gitignore");

  if (!fs.existsSync(gitignorePath)) {
    await fsp.writeFile(
      gitignorePath,
      "# Vendor directory managed by cppkg-cli\n# Uncomment the line below if you want to track vendor files in git\n*\n!.gitignore\n",
      "utf8",
    );
    logger.info("Created .gitignore in vendor directory");
  }

  if (options.removeOriginals) {
    logger.info("Removing original cpp_libs directory...");
    await fsp.rm(resolvePackageRootPath(), { force: true, recursive: true });
    logger.info("Removed cpp_libs directory");
  }

  logger.success(
    `Vendored ${copiedCount} package(s) into ${path.relative(process.cwd(), outputDir) || outputDir}`,
  );

  return { copied: copiedCount, outputDir };
}
