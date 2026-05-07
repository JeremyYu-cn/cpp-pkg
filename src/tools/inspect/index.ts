import type { IncludeUsage, ProjectInspection } from "./types";
import path from "node:path";
import { resolvePackageRootPath } from "../../public/packagePath";
import { normalizeTrackedPath, readInstalledDependencies } from "../deps";
import { normalizePackageKey } from "./path";
import {
  getInstalledPackageKeys,
  getManifestPackageKeys,
  getPackageStatus,
  readManifestDependencies,
} from "./packages";
import { getIncludePackageRecommendation } from "./recommendations";
import {
  collectSourceFiles,
  getPackageCandidateName,
  isProjectLocalInclude,
  isStandardOrSystemInclude,
  readIncludeUsages,
} from "./scanner";

export type {
  IncludeUsage,
  InspectedPackage,
  InspectPackageStatus,
  PackageRecommendation,
  ProjectInspection,
} from "./types";

/**
 * Scans the current project for C/C++ includes and groups external package candidates.
 */
export async function inspectProjectPackages(): Promise<ProjectInspection> {
  const projectRootPath = process.cwd();
  const packageRootPath = resolvePackageRootPath();
  const sourceFiles = await collectSourceFiles(projectRootPath, packageRootPath);
  const projectFileSet = new Set(
    sourceFiles.map((filePath) =>
      normalizeTrackedPath(path.relative(projectRootPath, filePath)),
    ),
  );
  const projectFileBasenames = new Set(
    sourceFiles.map((filePath) => path.basename(filePath)),
  );
  const manifestDependencies = await readManifestDependencies();
  const installed = await readInstalledDependencies();
  const manifestKeys = getManifestPackageKeys(manifestDependencies);
  const installedKeys = getInstalledPackageKeys(installed.dependencies);
  const packageUsages = new Map<string, {
    displayName: string;
    includes: Set<string>;
    usages: IncludeUsage[];
  }>();
  let includeCount = 0;

  for (const sourceFile of sourceFiles) {
    const usages = await readIncludeUsages(sourceFile, projectRootPath);
    includeCount += usages.length;

    for (const usage of usages) {
      if (isStandardOrSystemInclude(usage.includePath)) {
        continue;
      }

      if (
        isProjectLocalInclude(
          usage,
          sourceFile,
          projectRootPath,
          projectFileSet,
          projectFileBasenames,
        )
      ) {
        continue;
      }

      const packageName = getPackageCandidateName(usage.includePath);

      if (!packageName) {
        continue;
      }

      const key = normalizePackageKey(packageName);
      const existing = packageUsages.get(key) ?? {
        displayName: packageName,
        includes: new Set<string>(),
        usages: [],
      };

      existing.includes.add(usage.includePath);
      existing.usages.push(usage);
      packageUsages.set(key, existing);
    }
  }

  const packages = [...packageUsages.entries()]
    .map(([key, value]) => {
      const includes = [...value.includes].sort();
      const recommendation = getIncludePackageRecommendation(includes);

      return {
        includes,
        name: value.displayName,
        ...(recommendation ? { recommendation } : {}),
        status: getPackageStatus(key, installedKeys, manifestKeys),
        usages: value.usages.sort((left, right) =>
          left.filePath.localeCompare(right.filePath) || left.line - right.line,
        ),
      };
    })
    .sort((left, right) =>
      left.status.localeCompare(right.status) || left.name.localeCompare(right.name),
    );

  return {
    filesScanned: sourceFiles.length,
    includeCount,
    packages,
  };
}
