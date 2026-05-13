import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import type { ManifestDependency } from "../public/manifest";
import { MANIFEST_FILE_NAME } from "../public/manifest";
import { importConanDependencies, importVcpkgDependencies } from "../tools/import";
import { logger } from "../tools/logger";

type ImportOptions = {
  dryRun?: boolean;
  replace?: boolean;
};

function detectFormat(filePath: string): "vcpkg" | "conan" {
  const basename = path.basename(filePath).toLowerCase();

  if (basename === "vcpkg.json") {
    return "vcpkg";
  }

  if (basename === "conanfile.txt") {
    return "conan";
  }

  if (basename.startsWith("vcpkg")) {
    return "vcpkg";
  }

  if (basename.startsWith("conanfile")) {
    return "conan";
  }

  throw new Error(
    `Cannot detect package format from filename "${basename}". Expected vcpkg.json or conanfile.txt.`,
  );
}

function readExistingManifest(): { dependencies: ManifestDependency[] } {
  const manifestPath = path.resolve(process.cwd(), MANIFEST_FILE_NAME);

  if (!fs.existsSync(manifestPath)) {
    return { dependencies: [] };
  }

  const content = fs.readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const existingDeps = parsed.dependencies;

  if (Array.isArray(existingDeps)) {
    return { dependencies: existingDeps as ManifestDependency[] };
  }

  if (typeof existingDeps === "object" && existingDeps !== null) {
    const deps = existingDeps as Record<string, unknown>;
    const list: ManifestDependency[] = [];

    for (const [name, entry] of Object.entries(deps)) {
      if (typeof entry === "string") {
        list.push({ name, source: entry });
      } else if (typeof entry === "object" && entry !== null) {
        const obj = entry as Record<string, unknown>;
        list.push({
          name,
          source: typeof obj.source === "string" ? obj.source : "",
          ...obj,
        } as ManifestDependency);
      }
    }

    return { dependencies: list };
  }

  return { dependencies: [] };
}

function writeManifest(dependencies: ManifestDependency[]) {
  const manifestPath = path.resolve(process.cwd(), MANIFEST_FILE_NAME);
  const manifest: Record<string, unknown> = {};

  if (fs.existsSync(manifestPath)) {
    const content = fs.readFileSync(manifestPath, "utf8");
    const existing = JSON.parse(content) as Record<string, unknown>;

    if (typeof existing.dependencies === "object" && existing.dependencies !== null && !Array.isArray(existing.dependencies)) {
      manifest.dependencies = existing.dependencies;
    } else {
      manifest.dependencies = {};
    }
  } else {
    manifest.dependencies = {};
  }

  const depObject = manifest.dependencies as Record<string, unknown>;

  for (const dep of dependencies) {
    const name = dep.name || "unknown";

    if (Object.keys(dep).length === 2 && dep.name && dep.source) {
      depObject[name] = dep.source;
    } else {
      const { name: _name, ...rest } = dep;
      if (Object.keys(rest).length === 1 && rest.source) {
        depObject[name] = rest.source;
      } else {
        depObject[name] = rest;
      }
    }
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

/**
 * Registers the command that imports dependencies from vcpkg.json or conanfile.txt.
 */
export function registerImportCommand(program: Command) {
  program
    .command("import")
    .description("Import dependencies from vcpkg.json or conanfile.txt into cppkg.json")
    .argument(
      "<file>",
      "Path to vcpkg.json, conanfile.txt, or auto-detect from filename",
    )
    .option(
      "--dry-run",
      "Show what would be imported without writing",
    )
    .option(
      "--replace",
      "Replace existing dependencies instead of merging",
    )
    .action((file: string, options: ImportOptions) => {
      const filePath = path.resolve(file);
      const format = detectFormat(filePath);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      let importedDeps: ManifestDependency[];

      if (format === "vcpkg") {
        importedDeps = importVcpkgDependencies(filePath);
      } else {
        importedDeps = importConanDependencies(filePath);
      }

      if (!importedDeps.length) {
        logger.info(`No dependencies found in ${path.basename(filePath)}.`);
        return;
      }

      if (options.dryRun) {
        logger.info(
          `Dry run: would import ${importedDeps.length} package(s) from ${path.basename(filePath)}:`,
        );

        for (const dep of importedDeps) {
          logger.detail("package", `${dep.name} -> ${dep.source}`);
        }

        return;
      }

      const existing = readExistingManifest();

      let finalDeps: ManifestDependency[];

      if (options.replace) {
        finalDeps = importedDeps;
      } else {
        const existingSources = new Set(
          existing.dependencies.map((dep) => dep.source),
        );
        const existingNames = new Set(
          existing.dependencies.map((dep) => dep.name).filter(Boolean),
        );

        const newDeps = importedDeps.filter(
          (dep) =>
            !existingSources.has(dep.source) &&
            (dep.name ? !existingNames.has(dep.name) : true),
        );

        finalDeps = [...existing.dependencies, ...newDeps];
      }

      writeManifest(finalDeps);

      logger.success(
        `Imported ${importedDeps.length} package(s) from ${path.basename(filePath)} into ${MANIFEST_FILE_NAME}.`,
      );
    });
}
