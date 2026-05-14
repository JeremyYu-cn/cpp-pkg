import type { ResolvedInputSource } from "../types";
import { getArchiveNameFromURL, getArchivePackageName, getPackageName, getProjectInstallDirName } from "./common";
import { tryParseGitHubRepoPath, getGitHubRepositoryURL } from "./github";
import { tryParseGiteeRepoPath, getGiteeRepositoryURL } from "./gitee";
import { tryParseGitLabRepoPath, getGitLabRepositoryURL } from "./gitlab";
import { tryParseBitbucketRepoPath, getBitbucketRepositoryURL } from "./bitbucket";

export * from "./common";
export * from "./github";
export * from "./gitee";
export * from "./gitlab";
export * from "./bitbucket";

export function resolveInputSource(inputURL: string): ResolvedInputSource {
  const parsed = new URL(inputURL);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  const githubRepoPath = tryParseGitHubRepoPath(inputURL);
  if (githubRepoPath) {
    return {
      kind: "github-repository",
      packageName: getPackageName(githubRepoPath),
      projectInstallDirName: getProjectInstallDirName(
        githubRepoPath.split("/").filter(Boolean).join("_"),
      ),
      repositoryPath: githubRepoPath,
      repositoryUrl: getGitHubRepositoryURL(githubRepoPath),
    };
  }

  const giteeRepoPath = tryParseGiteeRepoPath(inputURL);
  if (giteeRepoPath) {
    return {
      kind: "gitee-repository",
      packageName: getPackageName(giteeRepoPath),
      projectInstallDirName: getProjectInstallDirName(
        giteeRepoPath.split("/").filter(Boolean).join("_"),
      ),
      repositoryPath: giteeRepoPath,
      repositoryUrl: getGiteeRepositoryURL(giteeRepoPath),
    };
  }

  const gitlabRepoPath = tryParseGitLabRepoPath(inputURL);
  if (gitlabRepoPath) {
    return {
      kind: "gitlab-repository",
      packageName: getPackageName(gitlabRepoPath),
      projectInstallDirName: getProjectInstallDirName(
        gitlabRepoPath.split("/").filter(Boolean).join("_"),
      ),
      repositoryPath: gitlabRepoPath,
      repositoryUrl: getGitLabRepositoryURL(gitlabRepoPath),
    };
  }

  const bitbucketRepoPath = tryParseBitbucketRepoPath(inputURL);
  if (bitbucketRepoPath) {
    return {
      kind: "bitbucket-repository",
      packageName: getPackageName(bitbucketRepoPath),
      projectInstallDirName: getProjectInstallDirName(
        bitbucketRepoPath.split("/").filter(Boolean).join("_"),
      ),
      repositoryPath: bitbucketRepoPath,
      repositoryUrl: getBitbucketRepositoryURL(bitbucketRepoPath),
    };
  }

  const canonicalArchiveURL = parsed.toString();
  return {
    archive: {
      kind: "archive-url",
      label: getArchiveNameFromURL(canonicalArchiveURL),
      url: canonicalArchiveURL,
    },
    kind: "archive-url",
    packageName: getArchivePackageName(canonicalArchiveURL),
    projectInstallDirName: getProjectInstallDirName(
      `${parsed.hostname}${parsed.pathname.replace(/\.zip$/i, "")}${parsed.search}`,
    ),
    repositoryPath: canonicalArchiveURL,
    repositoryUrl: canonicalArchiveURL,
  };
}
