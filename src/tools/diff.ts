import type { LockedDependency, PackageLockFile } from "./lockfile";
import { readPackageLock } from "./lockfile";
import type { ManifestDependency } from "../public/manifest";
import { readPackageManifest, MANIFEST_FILE_NAME } from "../public/manifest";
import { resolveInputSource } from "./download/sources";

export type DiffEntry = {
  name: string;
  field: string;
  oldValue: string;
  newValue: string;
};

export type DiffResult = {
  entries: DiffEntry[];
  manifestChanged: boolean;
  lockfileMissing: boolean;
};

function getManifestSourceIdentity(dep: ManifestDependency): string {
  return resolveInputSource(dep.source).repositoryUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "");
}

export async function diffLockfile(): Promise<DiffResult> {
  const manifest = await readPackageManifest().catch(() => null);
  const lockfile = await readPackageLock({ allowMissing: true });

  const entries: DiffEntry[] = [];

  if (!lockfile) {
    return { entries, manifestChanged: true, lockfileMissing: true };
  }

  if (!manifest || !manifest.dependencies.length) {
    return { entries, manifestChanged: true, lockfileMissing: false };
  }

  const lockfileMap = new Map<string, LockedDependency>();
  for (const dep of lockfile.dependencies) {
    const identity = dep.repository.url.trim().replace(/\/+$/, "").replace(/\.git$/i, "");
    lockfileMap.set(identity.toLowerCase(), dep);
  }

  for (const manifestDep of manifest.dependencies) {
    const identity = getManifestSourceIdentity(manifestDep).toLowerCase();
    const locked = lockfileMap.get(identity);

    if (!locked) {
      entries.push({
        name: manifestDep.name || "unknown",
        field: "status",
        oldValue: "not in lockfile",
        newValue: "in manifest",
      });
      continue;
    }

    const name = manifestDep.name || locked.name;

    if (manifestDep.tag && locked.source.requested?.type !== "tag") {
      entries.push({
        name,
        field: "source",
        oldValue: `tag:${locked.source.requested?.value || "none"}`,
        newValue: `tag:${manifestDep.tag}`,
      });
    }

    if (manifestDep.branch && locked.source.requested?.type !== "branch") {
      entries.push({
        name,
        field: "source",
        oldValue: `branch:${locked.source.requested?.value || "none"}`,
        newValue: `branch:${manifestDep.branch}`,
      });
    }
  }

  return {
    entries,
    manifestChanged: entries.length > 0,
    lockfileMissing: false,
  };
}
