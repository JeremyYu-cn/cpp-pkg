import type { InstalledDependency, GetPkgOptions } from "../types/global";
import {
  fetchLatestGitHubRelease,
  fetchLatestGiteeRelease,
  resolveInputSource,
} from "./download/sources";

export type OutdatedResult = {
  currentVersion: string;
  latestVersion?: string;
  outdated: boolean;
  error?: string;
};

export async function checkPackageOutdated(
  dep: InstalledDependency,
  options: Pick<GetPkgOptions, "httpProxy" | "httpsProxy"> & { prerelease?: boolean },
): Promise<OutdatedResult> {
  const currentVersion = dep.version || dep.release.tagName || "unknown";
  let sourceUrl = dep.repository.url || dep.source.archiveUrl;

  try {
    const inputSource = resolveInputSource(sourceUrl);

    if (inputSource.kind === "github-repository") {
      const release = await fetchLatestGitHubRelease(
        inputSource.repositoryPath,
        {
          ...options,
          ...(options.prerelease ? { prerelease: true } : {}),
        },
      );

      if (!release) {
        return {
          currentVersion,
          outdated: false,
          error: "No releases found",
        };
      }

      const latestTag = release.tag_name || release.name || "";
      const currentTag = dep.release.tagName || dep.release.name || "";
      if (latestTag && latestTag !== currentTag) {
        return {
          currentVersion,
          latestVersion: latestTag,
          outdated: true,
        };
      }

      return { currentVersion, outdated: false };
    }

    if (inputSource.kind === "gitee-repository") {
      const release = await fetchLatestGiteeRelease(
        inputSource.repositoryPath,
        {
          ...options,
          ...(options.prerelease ? { prerelease: true } : {}),
        },
      );

      if (!release) {
        return {
          currentVersion,
          outdated: false,
          error: "No releases found",
        };
      }

      const latestTag = release.tag_name || release.name || "";
      const currentTag = dep.release.tagName || dep.release.name || "";
      if (latestTag && latestTag !== currentTag) {
        return {
          currentVersion,
          latestVersion: latestTag,
          outdated: true,
        };
      }

      return { currentVersion, outdated: false };
    }

    return {
      currentVersion,
      outdated: false,
      error: "Cannot check updates for archive-url sources",
    };
  } catch (error: unknown) {
    return {
      currentVersion,
      outdated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
