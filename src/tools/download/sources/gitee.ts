import type { GetPkgOptions } from "../../../types/global";
import { GiteeRelease, GiteeRepository } from "../types";
import axios from "axios";
import { getRequestConfig } from "../../request";
import { pickReleaseByTag } from "./common";
import { pickReleaseByVersionRange } from "../versions";

export function tryParseGiteeRepoPath(inputURL: string) {
  const repo = new URL(inputURL);
  const isRepositoryPage = ["gitee.com", "www.gitee.com"].includes(repo.hostname);

  if (!isRepositoryPage) return null;

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (parts[0] === "api" && parts[1] === "v5") {
    if (parts.length !== 5 || parts[2] !== "repos") return null;
    const owner = parts[3]!;
    const repoName = parts[4]!.replace(/\.git$/, "");
    return `/${owner}/${repoName}`;
  }

  if (parts.length !== 2) return null;
  const owner = parts[0]!;
  const repoName = parts[1]!.replace(/\.git$/, "");
  return `/${owner}/${repoName}`;
}

export function getGiteeRepositoryURL(repoPath: string) {
  return `https://gitee.com${repoPath}.git`;
}

function pickGiteeRelease(releases: GiteeRelease[], includePrerelease = false) {
  return releases.find((release) => includePrerelease || !release.prerelease) ?? null;
}

export function pickGiteeReleaseArchive(repoPath: string, release: GiteeRelease) {
  const tagName = release.tag_name || release.name || "release";
  return {
    kind: "gitee-release" as const,
    label: `${tagName}.zip`,
    url: `https://gitee.com${repoPath}/repository/archive/${encodeURIComponent(tagName)}.zip`,
  };
}

export function pickGiteeRepositoryArchive(
  repoPath: string,
  repository: GiteeRepository,
  ref = repository.default_branch,
) {
  return {
    kind: "gitee-repository" as const,
    label: `${ref}.zip`,
    url: `https://gitee.com${repoPath}/repository/archive/${encodeURIComponent(ref)}.zip`,
  };
}

export async function fetchGiteeRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitee.com/api/v5/repos${repoPath}`;
  const res = await axios<GiteeRepository>(url, {
    method: "GET",
    ...getRequestConfig(url, options, {
      "content-type": "application/json",
      "user-agent": "cppkg-cli",
    }),
  });
  return res.data;
}

export async function fetchLatestGiteeRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitee.com/api/v5/repos${repoPath}/releases`;
  const res = await axios<GiteeRelease[]>(url, {
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
        `No Gitee release for ${repoPath} matches version range ${options.versionRange}.`,
      );
    }
    return release;
  }

  return pickGiteeRelease(res.data, options.prerelease);
}
