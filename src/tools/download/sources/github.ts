import type { GitHubRelease } from "../../../types/github";
import type { GetPkgOptions } from "../../../types/global";
import { GitHubRepository, GitHubReleaseAsset } from "../types";
import axios from "axios";
import { getRequestConfig, hasProviderToken } from "../../request";
import { isZipAsset, pickReleaseByTag } from "./common";
import { pickReleaseByVersionRange } from "../versions";

export function tryParseGitHubRepoPath(inputURL: string) {
  const repo = new URL(inputURL);
  const isRepositoryPage = ["github.com", "www.github.com"].includes(repo.hostname);
  const isApiRepository = repo.hostname === "api.github.com";

  if (!isRepositoryPage && !isApiRepository) return null;

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (isApiRepository) {
    if (parts.length !== 3 || parts[0] !== "repos") return null;
    const owner = parts[1]!;
    const repoName = parts[2]!.replace(/\.git$/, "");
    return `/${owner}/${repoName}`;
  }

  if (parts.length !== 2) return null;
  const owner = parts[0]!;
  const repoName = parts[1]!.replace(/\.git$/, "");
  return `/${owner}/${repoName}`;
}

export function getGitHubRepositoryURL(repoPath: string) {
  return `https://github.com${repoPath}`;
}

function pickGitHubRelease(releases: GitHubRelease[], includePrerelease = false) {
  return releases.find(
    (release) =>
      !release.draft && (includePrerelease || !release.prerelease),
  );
}

export function pickGitHubReleaseArchive(
  release: GitHubRelease,
  options: GetPkgOptions = {},
) {
  const zipAsset = release.assets.find(isZipAsset);

  if (zipAsset) {
    if (hasProviderToken("github", options)) {
      return {
        headers: { accept: "application/octet-stream" },
        kind: "github-release" as const,
        label: zipAsset.name,
        url: zipAsset.url,
      };
    }
    return {
      kind: "github-release" as const,
      label: zipAsset.name,
      url: zipAsset.browser_download_url,
    };
  }

  return {
    kind: "github-release" as const,
    label: `${release.tag_name || release.name || "source"}.zip`,
    url: release.zipball_url,
  };
}

export function pickGitHubRepositoryArchive(
  repoPath: string,
  repository: GitHubRepository,
  ref = repository.default_branch,
) {
  return {
    kind: "github-repository" as const,
    label: `${ref}.zip`,
    url: `https://api.github.com/repos${repoPath}/zipball/${encodeURIComponent(ref)}`,
  };
}

export async function fetchGitHubRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.github.com/repos${repoPath}`;
  const res = await axios<GitHubRepository>(url, {
    method: "GET",
    ...getRequestConfig(url, options, {
      "content-type": "application/json",
      "user-agent": "cppkg-cli",
    }),
  });
  return res.data;
}

export async function fetchLatestGitHubRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.github.com/repos${repoPath}/releases`;
  const res = await axios<GitHubRelease[]>(url, {
    method: "GET",
    ...getRequestConfig(url, options, {
      "content-type": "application/json",
      "user-agent": "cppkg-cli",
    }),
  });

  if (options.tag) {
    return pickReleaseByTag(res.data, options.tag);
  }

  if (options.versionRange) {
    const release = pickReleaseByVersionRange(
      res.data,
      options.versionRange,
      options.prerelease,
    );
    if (!release) {
      throw new Error(
        `No GitHub release for ${repoPath} matches version range ${options.versionRange}.`,
      );
    }
    return release;
  }

  return pickGitHubRelease(res.data, options.prerelease) ?? null;
}
