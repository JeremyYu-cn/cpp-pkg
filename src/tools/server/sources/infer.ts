import { resolveInputSource } from "../../download/sources";
import type { SourceFormSuggestion, VersionSelectionHint } from "./types";

function normalizeLooseSourceInput(input: string) {
  const source = input.trim();

  if (!source) {
    throw new Error("source cannot be empty.");
  }

  try {
    return new URL(source).toString();
  } catch {
    if (/^(?:www\.)?(?:github|gitee)\.com\//i.test(source)) {
      return new URL(`https://${source}`).toString();
    }

    if (/^[^/\s]+\/[^/\s]+(?:\/.*)?$/u.test(source)) {
      return new URL(`https://github.com/${source}`).toString();
    }

    throw new Error(
      "source must be a URL, github.com/owner/repo, gitee.com/owner/repo, or owner/repo.",
    );
  }
}

function decodePathPart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readPathParts(url: URL) {
  return url.pathname
    .replace(/\/+$/u, "")
    .split("/")
    .filter(Boolean)
    .map(decodePathPart);
}

function removeGitSuffix(value: string) {
  return value.replace(/\.git$/iu, "");
}

function removeZipSuffix(value: string) {
  return value.replace(/\.zip$/iu, "");
}

function readRef(parts: string[], startIndex: number) {
  const ref = parts.slice(startIndex).join("/");

  return ref ? removeZipSuffix(ref) : undefined;
}

function selectionFromBranch(branch: string | undefined): VersionSelectionHint {
  return branch ? { branch } : {};
}

function selectionFromTag(tag: string | undefined): VersionSelectionHint {
  return tag ? { tag } : {};
}

function inferVersionSelection(parts: string[]): VersionSelectionHint {
  if (parts[0] === "tree") {
    return selectionFromBranch(readRef(parts, 1));
  }

  if (parts[0] === "releases" && parts[1] === "tag") {
    return selectionFromTag(readRef(parts, 2));
  }

  if (parts[0] === "archive" && parts[1] === "refs" && parts[2] === "tags") {
    return selectionFromTag(readRef(parts, 3));
  }

  if (parts[0] === "archive" && parts[1] === "refs" && parts[2] === "heads") {
    return selectionFromBranch(readRef(parts, 3));
  }

  if (parts[0] === "archive" && parts[1]) {
    return selectionFromBranch(readRef(parts, 1));
  }

  if (parts[0] === "zip" && parts[1] === "refs" && parts[2] === "tags") {
    return selectionFromTag(readRef(parts, 3));
  }

  if (parts[0] === "zip" && parts[1] === "refs" && parts[2] === "heads") {
    return selectionFromBranch(readRef(parts, 3));
  }

  return {};
}

function buildGitHubURL(owner: string, repoName: string) {
  return `https://github.com/${owner}/${removeGitSuffix(repoName)}`;
}

function buildGiteeURL(owner: string, repoName: string) {
  return `https://gitee.com/${owner}/${removeGitSuffix(repoName)}.git`;
}

function inferGitHubRepository(url: URL) {
  const parts = readPathParts(url);

  if (url.hostname === "api.github.com") {
    if (parts[0] !== "repos" || parts.length < 3) {
      return null;
    }

    return {
      source: buildGitHubURL(parts[1]!, parts[2]!),
      versionSelection: inferVersionSelection(parts.slice(3)),
    };
  }

  if (!["github.com", "www.github.com"].includes(url.hostname)) {
    return null;
  }

  if (parts.length < 2) {
    return null;
  }

  return {
    source: buildGitHubURL(parts[0]!, parts[1]!),
    versionSelection: inferVersionSelection(parts.slice(2)),
  };
}

function inferGiteeRepository(url: URL) {
  const parts = readPathParts(url);

  if (!["gitee.com", "www.gitee.com"].includes(url.hostname)) {
    return null;
  }

  if (parts[0] === "api" && parts[1] === "v5" && parts[2] === "repos") {
    if (parts.length < 5) {
      return null;
    }

    return {
      source: buildGiteeURL(parts[3]!, parts[4]!),
      versionSelection: inferVersionSelection(parts.slice(5)),
    };
  }

  if (parts.length < 2) {
    return null;
  }

  return {
    source: buildGiteeURL(parts[0]!, parts[1]!),
    versionSelection: inferVersionSelection(parts.slice(2)),
  };
}

function inferCodeloadGitHubRepository(url: URL) {
  if (url.hostname !== "codeload.github.com") {
    return null;
  }

  const parts = readPathParts(url);

  if (parts.length < 2) {
    return null;
  }

  return {
    source: buildGitHubURL(parts[0]!, parts[1]!),
    versionSelection: inferVersionSelection(parts.slice(2)),
  };
}

function inferRepositorySource(url: URL) {
  return (
    inferGitHubRepository(url) ||
    inferGiteeRepository(url) ||
    inferCodeloadGitHubRepository(url)
  );
}

export function inferSourceFormValues(input: string): SourceFormSuggestion {
  const normalizedSource = normalizeLooseSourceInput(input);
  const repositoryHint = inferRepositorySource(new URL(normalizedSource));
  const source = repositoryHint?.source ?? normalizedSource;
  const resolved = resolveInputSource(source);
  const suggestion: SourceFormSuggestion = {
    kind: resolved.kind,
    name: resolved.packageName,
    source: resolved.repositoryUrl,
  };

  if (repositoryHint?.versionSelection.branch) {
    suggestion.branch = repositoryHint.versionSelection.branch;
  }

  if (repositoryHint?.versionSelection.tag) {
    suggestion.tag = repositoryHint.versionSelection.tag;
  }

  return suggestion;
}
