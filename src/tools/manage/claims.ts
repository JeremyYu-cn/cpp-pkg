import type { InstalledDependency } from "../../types/global";
import {
  getTrackedInstallPaths,
  normalizeTrackedPath,
} from "../deps";

export function getOtherClaimedPaths(
  dependency: InstalledDependency,
  otherDependencies: InstalledDependency[],
) {
  return new Set(
    otherDependencies
      .filter(
        (item) =>
          normalizeTrackedPath(item.install.target) ===
          normalizeTrackedPath(dependency.install.target),
      )
      .flatMap((item) => getTrackedInstallPaths(item)),
  );
}

export function directoryClaimedByOthers(
  directoryPath: string,
  claimedPaths: Set<string>,
) {
  for (const claimedPath of claimedPaths) {
    if (
      claimedPath === directoryPath ||
      claimedPath.startsWith(`${directoryPath}/`)
    ) {
      return true;
    }
  }

  return false;
}
