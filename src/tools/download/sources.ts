import type { GitHubRelease } from "../../types/github";
import type { GetPkgOptions } from "../../types/global";
import axios from "axios";
import path from "node:path";
import { getRequestConfig, hasProviderToken } from "../request";
import type {
  ArchiveDescriptor,
  BitbucketRelease,
  BitbucketRepository,
  GiteeRelease,
  GiteeRepository,
  GitHubReleaseAsset,
  GitHubRepository,
  GitLabRelease,
  GitLabRepository,
  ProviderRelease,
  ResolvedInputSource,
} from "./types";
import { pickReleaseByVersionRange } from "./versions";

const ZIP_CONTENT_TYPES = new Set([
  "application/octet-stream",
  "application/x-zip-compressed",
  "application/zip",
]);

/**
 * Returns the GitHub repository path when one repository root URL is provided.
 */
function tryParseGitHubRepoPath(inputURL: string) {
  const repo = new URL(inputURL);

  const isRepositoryPage = ["github.com", "www.github.com"].includes(
    repo.hostname,
  );
  const isApiRepository = repo.hostname === "api.github.com";

  if (!isRepositoryPage && !isApiRepository) {
    return null;
  }

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (isApiRepository) {
    if (parts.length !== 3 || parts[0] !== "repos") {
      return null;
    }

    const owner = parts[1]!;
    const repoName = parts[2]!.replace(/\.git$/, "");

    return `/${owner}/${repoName}`;
  }

  if (parts.length !== 2) {
    return null;
  }

  const owner = parts[0]!;
  const repoName = parts[1]!.replace(/\.git$/, "");

  return `/${owner}/${repoName}`;
}

/**
 * Returns the Gitee repository path when one repository root URL is provided.
 */
function tryParseGiteeRepoPath(inputURL: string) {
  const repo = new URL(inputURL);

  const isRepositoryPage = ["gitee.com", "www.gitee.com"].includes(
    repo.hostname,
  );
  const isApiRepository = repo.hostname === "gitee.com";

  if (!isRepositoryPage && !isApiRepository) {
    return null;
  }

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (parts[0] === "api" && parts[1] === "v5") {
    if (parts.length !== 5 || parts[2] !== "repos") {
      return null;
    }

    const owner = parts[3]!;
    const repoName = parts[4]!.replace(/\.git$/, "");

    return `/${owner}/${repoName}`;
  }

  if (parts.length !== 2) {
    return null;
  }

  const owner = parts[0]!;
  const repoName = parts[1]!.replace(/\.git$/, "");

  return `/${owner}/${repoName}`;
}

/**
 * Derives a package display name from the repository path.
 */
function getPackageName(repoPath: string) {
  return repoPath.split("/").filter(Boolean).at(-1) ?? "package";
}

/**
 * Rebuilds the canonical GitHub repository URL from the repository path.
 */
function getGitHubRepositoryURL(repoPath: string) {
  return `https://github.com${repoPath}`;
}

/**
 * Rebuilds the canonical Gitee repository URL from the repository path.
 */
function getGiteeRepositoryURL(repoPath: string) {
  return `https://gitee.com${repoPath}.git`;
}

/**
 * Returns the GitLab repository path when one repository root URL is provided.
 */
function tryParseGitLabRepoPath(inputURL: string) {
  const repo = new URL(inputURL);

  const isRepositoryPage = ["gitlab.com", "www.gitlab.com"].includes(
    repo.hostname,
  );
  const isApiRepository = repo.hostname === "api.gitlab.com";

  if (!isRepositoryPage && !isApiRepository) {
    return null;
  }

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (isApiRepository) {
    if (parts.length < 3 || parts[0] !== "projects") {
      return null;
    }

    const encodedPath = parts.slice(1).join("/");
    const decodedPath = decodeURIComponent(encodedPath);

    return `/${decodedPath}`;
  }

  if (parts.length < 2) {
    return null;
  }

  const repoPath = parts.join("/");

  return `/${repoPath}`;
}

/**
 * Rebuilds the canonical GitLab repository URL from the repository path.
 */
function getGitLabRepositoryURL(repoPath: string) {
  return `https://gitlab.com${repoPath}`;
}

/**
 * Returns the Bitbucket repository path when one repository root URL is provided.
 */
function tryParseBitbucketRepoPath(inputURL: string) {
  const repo = new URL(inputURL);

  const isRepositoryPage = ["bitbucket.org", "www.bitbucket.org"].includes(
    repo.hostname,
  );

  if (!isRepositoryPage) {
    return null;
  }

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const owner = parts[0]!;
  const repoName = parts[1]!.replace(/\.git$/, "");

  return `/${owner}/${repoName}`;
}

/**
 * Rebuilds the canonical Bitbucket repository URL from the repository path.
 */
function getBitbucketRepositoryURL(repoPath: string) {
  return `https://bitbucket.org${repoPath}`;
}

/**
 * Creates a stable directory name for one installed project.
 */
function getProjectInstallDirName(identifier: string) {
  return identifier
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "project";
}

/**
 * Derives a readable archive file name from one remote archive URL.
 */
function getArchiveNameFromURL(archiveURL: string) {
  const parsed = new URL(archiveURL);
  const rawName = decodeURIComponent(path.posix.basename(parsed.pathname));

  if (!rawName) {
    return `${parsed.hostname}.zip`;
  }

  return rawName.endsWith(".zip") ? rawName : `${rawName}.zip`;
}

/**
 * Derives one package display name from a remote archive URL.
 */
function getArchivePackageName(archiveURL: string) {
  const archiveName = getArchiveNameFromURL(archiveURL);
  return archiveName.replace(/\.zip$/i, "") || "package";
}

/**
 * Resolves the user input into either a GitHub repository source or a direct archive source.
 */
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

/**
 * Checks whether a release asset looks like a usable zip archive.
 */
function isZipAsset(asset: GitHubReleaseAsset) {
  const assetName = asset.name.toLowerCase();
  return (
    ZIP_CONTENT_TYPES.has(asset.content_type.toLowerCase()) ||
    assetName.endsWith(".zip")
  );
}

/**
 * Picks the latest non-draft and non-prerelease GitHub release.
 */
function pickGitHubRelease(releases: GitHubRelease[], includePrerelease = false) {
  return releases.find(
    (release) =>
      !release.draft && (includePrerelease || !release.prerelease),
  );
}

/**
 * Picks the latest non-prerelease Gitee release.
 */
function pickGiteeRelease(releases: GiteeRelease[], includePrerelease = false) {
  return (
    releases.find(
      (release) => includePrerelease || !release.prerelease,
    ) ?? null
  );
}

/**
 * Finds one release by tag or name.
 */
function pickReleaseByTag<TRelease extends ProviderRelease>(
  releases: TRelease[],
  tag: string,
) {
  return (
    releases.find(
      (release) => release.tag_name === tag || release.name === tag,
    ) ?? null
  );
}

/**
 * Selects the preferred downloadable archive for a GitHub release.
 */
export function pickGitHubReleaseArchive(
  release: GitHubRelease,
  options: GetPkgOptions = {},
) {
  const zipAsset = release.assets.find(isZipAsset);

  if (zipAsset) {
    if (hasProviderToken("github", options)) {
      return {
        headers: {
          accept: "application/octet-stream",
        },
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

/**
 * Builds a default-branch GitHub repository archive descriptor.
 */
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

/**
 * Builds a release archive descriptor for one Gitee release.
 */
export function pickGiteeReleaseArchive(repoPath: string, release: GiteeRelease) {
  const tagName = release.tag_name || release.name || "release";

  return {
    kind: "gitee-release" as const,
    label: `${tagName}.zip`,
    url: `https://gitee.com${repoPath}/repository/archive/${encodeURIComponent(tagName)}.zip`,
  };
}

/**
 * Builds a default-branch Gitee repository archive descriptor.
 */
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

/**
 * Fetches GitHub repository metadata needed for whole-project downloads and release fallbacks.
 */
export async function fetchGitHubRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.github.com/repos${repoPath}`;
  const res = await axios<GitHubRepository>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

  return res.data;
}

/**
 * Fetches Gitee repository metadata needed for whole-project downloads and release fallbacks.
 */
export async function fetchGiteeRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitee.com/api/v5/repos${repoPath}`;
  const res = await axios<GiteeRepository>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

  return res.data;
}

/**
 * Fetches GitHub releases and returns the latest published one when available.
 */
export async function fetchLatestGitHubRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.github.com/repos${repoPath}/releases`;
  const res = await axios<GitHubRelease[]>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

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

/**
 * Fetches Gitee releases and returns the latest published one when available.
 */
export async function fetchLatestGiteeRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitee.com/api/v5/repos${repoPath}/releases`;
  const res = await axios<GiteeRelease[]>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

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

/**
 * Picks the latest non-upcoming GitLab release.
 */
function pickGitLabRelease(releases: GitLabRelease[], includePrerelease = false) {
  return releases.find(
    (release) => includePrerelease || !release.upcoming_release,
  );
}

/**
 * Picks the latest Bitbucket release (first from the list).
 */
function pickBitbucketRelease(releases: BitbucketRelease[]) {
  return releases[0] ?? null;
}

/**
 * Builds a release archive descriptor for one GitLab release.
 */
export function pickGitLabReleaseArchive(
  repoPath: string,
  release: GitLabRelease,
) {
  const tagName = release.tag_name || release.name || "release";
  const projectName = repoPath.split("/").filter(Boolean).at(-1) ?? "project";

  return {
    kind: "gitlab-release" as const,
    label: `${tagName}.zip`,
    url: `https://gitlab.com${repoPath}/-/archive/${encodeURIComponent(tagName)}/${projectName}-${encodeURIComponent(tagName)}.zip`,
  };
}

/**
 * Builds a default-branch GitLab repository archive descriptor.
 */
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

/**
 * Builds a release archive descriptor for one Bitbucket release/tag.
 */
export function pickBitbucketReleaseArchive(
  repoPath: string,
  release: BitbucketRelease,
) {
  const tagName = release.tag_name || release.name || "release";

  return {
    kind: "bitbucket-release" as const,
    label: `${tagName}.zip`,
    url: `https://bitbucket.org${repoPath}/get/${encodeURIComponent(tagName)}.zip`,
  };
}

/**
 * Builds a default-branch Bitbucket repository archive descriptor.
 */
export function pickBitbucketRepositoryArchive(
  repoPath: string,
  repository: BitbucketRepository,
  ref?: string,
) {
  const branchRef = ref || repository.mainbranch?.name || "main";

  return {
    kind: "bitbucket-repository" as const,
    label: `${branchRef}.zip`,
    url: `https://bitbucket.org${repoPath}/get/${encodeURIComponent(branchRef)}.zip`,
  };
}

/**
 * Fetches GitLab repository metadata.
 */
export async function fetchGitLabRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoPath)}`;
  const res = await axios<GitLabRepository>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

  return res.data;
}

/**
 * Fetches GitLab releases and returns the latest published one when available.
 */
export async function fetchLatestGitLabRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoPath)}/releases`;
  const res = await axios<GitLabRelease[]>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

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

type BitbucketTagRef = {
  name: string;
};

type BitbucketRefsResponse = {
  values: BitbucketTagRef[];
};

/**
 * Fetches Bitbucket repository metadata.
 */
export async function fetchBitbucketRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.bitbucket.org/2.0/repositories${repoPath}`;
  const res = await axios<BitbucketRepository>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

  return res.data;
}

/**
 * Fetches Bitbucket tags/releases and returns the latest one when available.
 */
export async function fetchLatestBitbucketRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.bitbucket.org/2.0/repositories${repoPath}/refs/tags?sort=-name`;
  const res = await axios<BitbucketRefsResponse>(
    url,
    {
      method: "GET",
      ...getRequestConfig(url, options, {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      }),
    },
  );

  const releases: BitbucketRelease[] = (res.data.values ?? []).map((tag) => ({
    name: tag.name,
    tag_name: tag.name,
  }));

  if (options.tag) {
    return pickReleaseByTag(releases, options.tag);
  }

  if (options.versionRange) {
    const release = pickReleaseByVersionRange(
      releases,
      options.versionRange,
      options.prerelease,
    );

    if (!release) {
      throw new Error(
        `No Bitbucket release for ${repoPath} matches version range ${options.versionRange}.`,
      );
    }

    return release;
  }

  return pickBitbucketRelease(releases);
}
