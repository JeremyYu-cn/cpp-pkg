import type { GetPkgOptions } from "../../../types/global";
import { GitLabRelease, GitLabRepository } from "../types";
import axios from "axios";
import { getRequestConfig } from "../../request";
import { pickReleaseByTag } from "./common";
import { pickReleaseByVersionRange } from "../versions";

export function tryParseGitLabRepoPath(inputURL: string) {
  const repo = new URL(inputURL);
  const isRepositoryPage = ["gitlab.com", "www.gitlab.com"].includes(repo.hostname);
  const isApiRepository = repo.hostname === "api.gitlab.com";

  if (!isRepositoryPage && !isApiRepository) return null;

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (isApiRepository) {
    if (parts.length < 3 || parts[0] !== "projects") return null;
    const encodedPath = parts.slice(1).join("/");
    const decodedPath = decodeURIComponent(encodedPath);
    return `/${decodedPath}`;
  }

  if (parts.length < 2) return null;
  return `/${parts.join("/")}`;
}

export function getGitLabRepositoryURL(repoPath: string) {
  return `https://gitlab.com${repoPath}`;
}

function pickGitLabRelease(releases: GitLabRelease[], includePrerelease = false) {
  return releases.find(
    (release) => includePrerelease || !release.upcoming_release,
  );
}

export function pickGitLabReleaseArchive(repoPath: string, release: GitLabRelease) {
  const tagName = release.tag_name || release.name || "release";
  const projectName = repoPath.split("/").filter(Boolean).at(-1) ?? "project";
  return {
    kind: "gitlab-release" as const,
    label: `${tagName}.zip`,
    url: `https://gitlab.com${repoPath}/-/archive/${encodeURIComponent(tagName)}/${projectName}-${encodeURIComponent(tagName)}.zip`,
  };
}

export function pickGitLabRepositoryArchive(
  repoPath: string,
  repository: GitLabRepository,
  ref = repository.default_branch,
) {
  const projectName = repoPath.split("/").filter(Boolean).at(-1) ?? "project";
  return {
    kind: "gitlab-repository" as const,
    label: `${ref}.zip`,
    url: `https://gitlab.com${repoPath}/-/archive/${encodeURIComponent(ref)}/${projectName}-${encodeURIComponent(ref)}.zip`,
  };
}

export async function fetchGitLabRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoPath)}`;
  const res = await axios<GitLabRepository>(url, {
    method: "GET",
    ...getRequestConfig(url, options, {
      "content-type": "application/json",
      "user-agent": "cppkg-cli",
    }),
  });
  return res.data;
}

export async function fetchLatestGitLabRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoPath)}/releases`;
  const res = await axios<GitLabRelease[]>(url, {
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
        `No GitLab release for ${repoPath} matches version range ${options.versionRange}.`,
      );
    }
    return release;
  }

  return pickGitLabRelease(res.data, options.prerelease) ?? null;
}
