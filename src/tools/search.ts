import type { GetPkgOptions } from "../types/global";
import axios from "axios";
import { getRequestProxy } from "./request";

type GitHubSearchRepository = {
  archived?: boolean;
  default_branch?: string;
  description: string | null;
  disabled?: boolean;
  fork?: boolean;
  full_name: string;
  html_url: string;
  language: string | null;
  name: string;
  pushed_at?: string | null;
  stargazers_count: number;
};

type GitHubSearchResponse = {
  items: GitHubSearchRepository[];
  total_count: number;
};

export type PackageSearchOptions = Pick<
  GetPkgOptions,
  "httpProxy" | "httpsProxy"
> & {
  githubToken?: string;
  language?: string;
  limit?: number;
};

export type PackageSearchResult = {
  defaultBranch: string | null;
  description: string;
  language: string | null;
  name: string;
  repositoryPath: string;
  repositoryUrl: string;
  stars: number;
  updatedAt: string | null;
};

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;

function normalizeSearchQuery(query: string) {
  const normalized = query.trim();

  if (!normalized) {
    throw new Error("Search query cannot be empty.");
  }

  return normalized;
}

export function normalizeSearchLimit(limit = DEFAULT_SEARCH_LIMIT) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Search limit must be a positive integer.");
  }

  return Math.min(limit, MAX_SEARCH_LIMIT);
}

function normalizeSearchLanguage(language = "C++") {
  const normalized = language.trim();

  if (!normalized) {
    throw new Error("Search language cannot be empty.");
  }

  return normalized;
}

function getGitHubToken(options: PackageSearchOptions) {
  return options.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

function buildGitHubSearchQuery(query: string, language: string) {
  return `${query} language:${language} fork:false archived:false`;
}

function toRepositoryPath(fullName: string) {
  return `/${fullName.replace(/^\/+|\/+$/g, "")}`;
}

function toSearchResult(item: GitHubSearchRepository): PackageSearchResult {
  return {
    defaultBranch: item.default_branch || null,
    description: item.description || "",
    language: item.language || null,
    name: item.name,
    repositoryPath: toRepositoryPath(item.full_name),
    repositoryUrl: item.html_url,
    stars: item.stargazers_count,
    updatedAt: item.pushed_at || null,
  };
}

function compareSearchResultsByStars(
  left: PackageSearchResult,
  right: PackageSearchResult,
) {
  return right.stars - left.stars || left.repositoryPath.localeCompare(right.repositoryPath);
}

export function formatStarCount(stars: number) {
  if (stars >= 1_000_000) {
    return `${(stars / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }

  if (stars >= 1_000) {
    return `${(stars / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(stars);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function formatSearchResults(results: PackageSearchResult[]) {
  return results.map((result, index) => ({
    "#": index + 1,
    name: result.repositoryPath.replace(/^\/+/, ""),
    stars: formatStarCount(result.stars),
    language: result.language || "",
    description: truncate(result.description, 72),
    url: result.repositoryUrl,
  }));
}

/**
 * Searches public GitHub repositories that look like C/C++ packages.
 */
export async function searchGitHubPackages(
  query: string,
  options: PackageSearchOptions = {},
) {
  const normalizedQuery = normalizeSearchQuery(query);
  const language = normalizeSearchLanguage(options.language);
  const limit = normalizeSearchLimit(options.limit);
  const githubToken = getGitHubToken(options);
  const res = await axios<GitHubSearchResponse>(
    "https://api.github.com/search/repositories",
    {
      method: "GET",
      headers: {
        ...(githubToken ? { authorization: `Bearer ${githubToken}` } : {}),
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      },
      params: {
        order: "desc",
        per_page: limit,
        q: buildGitHubSearchQuery(normalizedQuery, language),
        sort: "stars",
      },
      ...getRequestProxy(options.httpProxy, options.httpsProxy),
    },
  );

  return res.data.items
    .filter((item) => !item.archived && !item.disabled)
    .map(toSearchResult)
    .sort(compareSearchResultsByStars)
    .slice(0, limit);
}
