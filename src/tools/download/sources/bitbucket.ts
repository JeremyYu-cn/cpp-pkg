import type { GetPkgOptions } from "../../../types/global";
import { BitbucketRelease, BitbucketRepository } from "../types";
import axios from "axios";
import { getRequestConfig } from "../../request";
import { pickReleaseByTag } from "./common";
import { pickReleaseByVersionRange } from "../versions";

export function tryParseBitbucketRepoPath(inputURL: string) {
  const repo = new URL(inputURL);
  const isRepositoryPage = ["bitbucket.org", "www.bitbucket.org"].includes(repo.hostname);

  if (!isRepositoryPage) return null;

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (parts.length < 2) return null;
  const owner = parts[0]!;
  const repoName = parts[1]!.replace(/\.git$/, "");
  return `/${owner}/${repoName}`;
}

export function getBitbucketRepositoryURL(repoPath: string) {
  return `https://bitbucket.org${repoPath}`;
}

function pickBitbucketRelease(releases: BitbucketRelease[]) {
  return releases[0] ?? null;
}

export function pickBitbucketReleaseArchive(repoPath: string, release: BitbucketRelease) {
  const tagName = release.tag_name || release.name || "release";
  return {
    kind: "bitbucket-release" as const,
    label: `${tagName}.zip`,
    url: `https://bitbucket.org${repoPath}/get/${encodeURIComponent(tagName)}.zip`,
  };
}

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

export async function fetchBitbucketRepository(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.bitbucket.org/2.0/repositories${repoPath}`;
  const res = await axios<BitbucketRepository>(url, {
    method: "GET",
    ...getRequestConfig(url, options, {
      "content-type": "application/json",
      "user-agent": "cppkg-cli",
    }),
  });
  return res.data;
}

export async function fetchLatestBitbucketRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const url = `https://api.bitbucket.org/2.0/repositories${repoPath}/refs/tags?sort=-name`;
  const res = await axios<{ values: { name: string }[] }>(url, {
    method: "GET",
    ...getRequestConfig(url, options, {
      "content-type": "application/json",
      "user-agent": "cppkg-cli",
    }),
  });

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

  return releases[0] ?? null;
}
