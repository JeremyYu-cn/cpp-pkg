import { promises as fsp } from "node:fs";
import path from "node:path";
import { readInstalledDependencies } from "./deps";
import { resolvePackageRootPath } from "../public/packagePath";

export type LicenseInfo = {
  packageName: string;
  licenseFile: string | null;
  licenseContent: string | null;
  repository: string;
  version: string;
};

const LICENSE_FILENAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENSE.rst",
  "license",
  "license.md",
  "license.txt",
  "COPYING",
  "COPYING.md",
  "COPYING.txt",
  "COPYING.LESSER",
  "LICENCE",
  "LICENCE.md",
  "LICENCE.txt",
];

async function findLicenseFile(pkgDir: string): Promise<string | null> {
  try {
    const entries = await fsp.readdir(pkgDir);
    for (const entry of entries) {
      if (LICENSE_FILENAMES.includes(entry)) {
        return path.join(pkgDir, entry);
      }
    }
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (lower.startsWith("license") || lower.startsWith("licence") || lower.startsWith("copying")) {
        return path.join(pkgDir, entry);
      }
    }
  } catch {
    // directory may not exist
  }
  return null;
}

export async function scanLicenses(): Promise<LicenseInfo[]> {
  const installed = await readInstalledDependencies();
  const pkgRoot = resolvePackageRootPath();
  const results: LicenseInfo[] = [];

  for (const dep of installed.dependencies) {
    let licenseFile: string | null = null;
    let licenseContent: string | null = null;

    const installTarget = path.resolve(pkgRoot, dep.install.target);
    for (const headerDir of dep.install.headers) {
      const candidate = path.resolve(installTarget, headerDir);
      const found = await findLicenseFile(candidate);
      if (found) {
        licenseFile = path.relative(process.cwd(), found);
        try {
          licenseContent = await fsp.readFile(found, "utf8");
        } catch {
          licenseContent = null;
        }
        break;
      }
    }

    if (!licenseFile) {
      const projectDir = path.resolve(
        pkgRoot,
        "projects",
        dep.name,
      );
      const found = await findLicenseFile(projectDir);
      if (found) {
        licenseFile = path.relative(process.cwd(), found);
        try {
          licenseContent = await fsp.readFile(found, "utf8");
        } catch {
          licenseContent = null;
        }
      }
    }

    results.push({
      packageName: dep.name,
      licenseFile,
      licenseContent,
      repository: dep.repository.url,
      version: dep.version,
    });
  }

  return results;
}
