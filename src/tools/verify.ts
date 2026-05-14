import { promises as fsp } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { readPackageLock } from "./lockfile";
import { resolvePackageRootPath } from "../public/packagePath";

export type VerifyIssue = {
  packageName: string;
  severity: "error" | "warn";
  code: string;
  message: string;
};

export type VerifyResult = {
  issues: VerifyIssue[];
  verified: number;
  passed: number;
};

export async function verifyPackages(): Promise<VerifyResult> {
  const lockfile = await readPackageLock();
  const issues: VerifyIssue[] = [];
  let verified = 0;
  let passed = 0;

  if (!lockfile) {
    return { issues: [], verified: 0, passed: 0 };
  }

  for (const dep of lockfile.dependencies) {
    verified++;
    const expectedChecksum = dep.source.integrity?.sha256;

    if (!expectedChecksum) {
      issues.push({
        packageName: dep.name,
        severity: "warn",
        code: "no-checksum",
        message: `No checksum recorded in lockfile for ${dep.name}`,
      });
      continue;
    }

    let allFilesMatch = true;

    for (const trackedPath of dep.install.paths) {
      const fullPath = path.resolve(resolvePackageRootPath(), trackedPath);

      try {
        const stat = await fsp.stat(fullPath);
        if (!stat.isFile() && !stat.isDirectory()) continue;

        if (stat.isFile()) {
          const content = await fsp.readFile(fullPath);
          const actualHash = createHash("sha256").update(content).digest("hex");

          if (actualHash !== expectedChecksum) {
            allFilesMatch = false;
            issues.push({
              packageName: dep.name,
              severity: "error",
              code: "checksum-mismatch",
              message: `Checksum mismatch for ${dep.name}: ${trackedPath}`,
            });
          }
        }
      } catch (error: unknown) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === "ENOENT") {
          allFilesMatch = false;
          issues.push({
            packageName: dep.name,
            severity: "error",
            code: "missing-path",
            message: `Missing tracked path for ${dep.name}: ${trackedPath}`,
          });
        }
      }
    }

    if (allFilesMatch) {
      passed++;
    }
  }

  return { issues, verified, passed };
}
