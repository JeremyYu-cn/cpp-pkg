import type { GitHubRelease } from "../types/github";
import type { GetPkgOptions, InstalledDependency } from "../types/global";
import axios from "axios";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import unzipper from "unzipper";
import {
  getProjectsRootPath,
  getPublicIncludePath,
} from "../public/packagePath";
import { normalizeTrackedPath, upsertInstalledDependency } from "./deps";
import { getRequestProxy } from "./request";

type GitHubReleaseAsset = GitHubRelease["assets"][number];
type GitHubRepository = {
  default_branch: string;
  full_name: string;
  html_url: string;
};

const ZIP_CONTENT_TYPES = new Set([
  "application/octet-stream",
  "application/x-zip-compressed",
  "application/zip",
]);

const HEADER_EXTENSIONS = new Set([
  ".h",
  ".hh",
  ".hpp",
  ".hxx",
  ".inc",
  ".ipp",
  ".tpp",
]);

/**
 * Validates and converts a GitHub repository URL into the API path format.
 */
function parseGitHubRepoPath(repoURL: string) {
  const repo = new URL(repoURL);

  const isRepositoryPage = ["github.com", "www.github.com"].includes(
    repo.hostname,
  );
  const isApiRepository = repo.hostname === "api.github.com";

  if (!isRepositoryPage && !isApiRepository) {
    throw new Error("Only GitHub repository URLs are supported");
  }

  const parts = repo.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  if (isApiRepository) {
    if (parts.length < 3 || parts[0] !== "repos") {
      throw new Error(
        "GitHub API repository URLs must look like https://api.github.com/repos/<owner>/<repo>",
      );
    }

    const owner = parts[1]!;
    const repoName = parts[2]!.replace(/\.git$/, "");

    return `/${owner}/${repoName}`;
  }

  if (parts.length < 2) {
    throw new Error(
      "Repository URL must look like https://github.com/<owner>/<repo>",
    );
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
function getRepositoryURL(repoPath: string) {
  return `https://github.com${repoPath}`;
}

/**
 * Creates a stable directory name for one full-project installation.
 */
function getProjectInstallDirName(repoPath: string) {
  return repoPath.split("/").filter(Boolean).join("_");
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
function pickRelease(releases: GitHubRelease[]) {
  return releases.find((release) => !release.draft && !release.prerelease);
}

/**
 * Selects the preferred downloadable archive for a release.
 */
function pickArchive(release: GitHubRelease) {
  const zipAsset = release.assets.find(isZipAsset);

  if (zipAsset) {
    return {
      label: zipAsset.name,
      url: zipAsset.browser_download_url,
    };
  }

  return {
    label: `${release.tag_name || release.name || "source"}.zip`,
    url: release.zipball_url,
  };
}

/**
 * Builds a default-branch repository archive descriptor for full-project extraction.
 */
function pickRepositoryArchive(repoPath: string, repository: GitHubRepository) {
  return {
    label: `${repository.default_branch}.zip`,
    url: `https://api.github.com/repos${repoPath}/zipball/${repository.default_branch}`,
  };
}

/**
 * Builds the metadata record written to cpp_libs/deps.json after installation.
 */
function buildInstalledDependency(
  repoPath: string,
  installPath: string,
  release: GitHubRelease | null,
  archive:
    | ReturnType<typeof pickArchive>
    | ReturnType<typeof pickRepositoryArchive>,
  installedHeaders: string[],
  installedPaths: string[],
  fullProject: boolean,
): InstalledDependency {
  return {
    name: getPackageName(repoPath),
    version:
      release?.tag_name || release?.name || archive.label.replace(/\.zip$/i, ""),
    installedAt: new Date().toISOString(),
    type: fullProject ? "need-compile" : "header-only",
    repository: {
      path: repoPath,
      url: getRepositoryURL(repoPath),
    },
    release: {
      tagName: release?.tag_name || null,
      name: release?.name || null,
      publishedAt: release?.published_at || null,
    },
    source: {
      type: release ? "github-release" : "github-repository",
      archiveName: archive.label,
      archiveUrl: archive.url,
    },
    install: {
      target: path.relative(process.cwd(), installPath) || "cpp_libs",
      headers: installedHeaders,
      paths: installedPaths,
    },
  };
}

/**
 * Fetches repository metadata needed for whole-project downloads and release fallbacks.
 */
async function fetchRepository(repoPath: string, options: GetPkgOptions = {}) {
  const res = await axios<GitHubRepository>(
    `https://api.github.com/repos${repoPath}`,
    {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      },
      ...getRequestProxy(options.httpProxy, options.httpsProxy),
    },
  );

  return res.data;
}

/**
 * Fetches repository releases and returns the latest published one when available.
 */
async function fetchLatestRelease(
  repoPath: string,
  options: GetPkgOptions = {},
) {
  const res = await axios<GitHubRelease[]>(
    `https://api.github.com/repos${repoPath}/releases`,
    {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "user-agent": "cppkg-cli",
      },
      ...getRequestProxy(options.httpProxy, options.httpsProxy),
    },
  );

  return pickRelease(res.data) ?? null;
}

/**
 * Streams a release archive to a temporary file while printing coarse progress.
 */
async function downloadArchive(
  url: string,
  archivePath: string,
  options: GetPkgOptions = {},
) {
  const res = await axios<NodeJS.ReadableStream>(url, {
    method: "GET",
    headers: {
      "User-Agent": "cppkg-cli",
    },
    responseType: "stream",
    ...getRequestProxy(options.httpProxy, options.httpsProxy),
  });

  const total = Number(res.headers["content-length"] ?? 0);
  let loaded = 0;
  let lastLoggedPercent = -10;

  res.data.on("data", (chunk: Buffer) => {
    loaded += chunk.length;

    if (!total) {
      return;
    }

    const percent = Math.floor((loaded / total) * 100);

    if (percent >= lastLoggedPercent + 10 || percent === 100) {
      lastLoggedPercent = percent;
      console.log(`Downloading: ${percent}%`);
    }
  });

  await pipeline(res.data, fs.createWriteStream(archivePath));
}

/**
 * Extracts a zip archive into a temporary working directory.
 */
async function extractZipArchive(archivePath: string, extractPath: string) {
  await fsp.mkdir(extractPath, { recursive: true });
  const directory = await unzipper.Open.file(archivePath);
  await directory.extract({ concurrency: 5, path: extractPath });
}

/**
 * Finds the main extracted source root, flattening GitHub zipball wrapper directories.
 */
async function getPrimaryExtractedRoot(extractPath: string) {
  const entries = await fsp.readdir(extractPath, { withFileTypes: true });
  const visibleEntries = entries.filter((entry) => entry.name !== "__MACOSX");

  if (visibleEntries.length === 1 && visibleEntries[0]!.isDirectory()) {
    return path.join(extractPath, visibleEntries[0]!.name);
  }

  return extractPath;
}

/**
 * Recursively checks whether a directory contains at least one header file.
 */
async function directoryContainsHeaders(dirPath: string): Promise<boolean> {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (await directoryContainsHeaders(entryPath)) {
        return true;
      }
      continue;
    }

    if (HEADER_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Computes relative path depth so nested include directories can be ranked.
 */
function getDepth(rootPath: string, targetPath: string) {
  return path.relative(rootPath, targetPath).split(path.sep).filter(Boolean)
    .length;
}

/**
 * Finds the most relevant include directories inside an extracted archive.
 */
async function collectIncludeDirs(rootPath: string): Promise<string[]> {
  const includeDirs: string[] = [];

  /**
   * Walks the extracted archive tree and collects candidate include directories.
   */
  async function walk(dirPath: string): Promise<void> {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "__MACOSX") {
        continue;
      }

      const entryPath = path.join(dirPath, entry.name);

      if (entry.name === "include") {
        if (await directoryContainsHeaders(entryPath)) {
          includeDirs.push(entryPath);
        }
        continue;
      }

      await walk(entryPath);
    }
  }

  await walk(rootPath);

  if (!includeDirs.length) {
    return [];
  }

  const minDepth = Math.min(
    ...includeDirs.map((includeDir) => getDepth(rootPath, includeDir)),
  );

  return includeDirs.filter(
    (includeDir) => getDepth(rootPath, includeDir) === minDepth,
  );
}

/**
 * Copies the full extracted project into a dedicated project directory.
 */
async function installWholeProject(
  sourceRootPath: string,
  targetProjectPath: string,
) {
  await fsp.rm(targetProjectPath, { force: true, recursive: true });
  await fsp.mkdir(targetProjectPath, { recursive: true });

  const entries = await fsp.readdir(sourceRootPath, { withFileTypes: true });
  const installedEntries = new Set<string>();

  for (const entry of entries) {
    const sourcePath = path.join(sourceRootPath, entry.name);
    const targetPath = path.join(targetProjectPath, entry.name);
    const relativePath = normalizeTrackedPath(entry.name);

    await fsp.cp(sourcePath, targetPath, {
      force: true,
      recursive: entry.isDirectory(),
    });

    installedEntries.add(relativePath);
  }

  return {
    headers: [...installedEntries].sort(),
    paths: [...installedEntries].sort(),
  };
}

/**
 * Copies the selected include directories into the shared include root and records installed paths.
 */
async function mergeIncludeDirs(
  includeDirs: string[],
  targetIncludeDir: string,
) {
  await fsp.mkdir(targetIncludeDir, { recursive: true });

  const installedEntries = new Set<string>();
  const installedPaths = new Set<string>();

  /**
   * Collects leaf file paths under one copied include entry for metadata tracking.
   */
  async function collectEntryPaths(
    sourcePath: string,
    relativePath: string,
  ): Promise<void> {
    const entries = await fsp.readdir(sourcePath, { withFileTypes: true });

    for (const entry of entries) {
      const sourceEntryPath = path.join(sourcePath, entry.name);
      const sourceEntryRelativePath = normalizeTrackedPath(
        `${relativePath}/${entry.name}`,
      );

      if (entry.isDirectory()) {
        await collectEntryPaths(sourceEntryPath, sourceEntryRelativePath);
        continue;
      }

      installedPaths.add(sourceEntryRelativePath);
    }
  }

  for (const includeDir of includeDirs) {
    const entries = await fsp.readdir(includeDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(includeDir, entry.name);
      const targetPath = path.join(targetIncludeDir, entry.name);
      const relativePath = normalizeTrackedPath(entry.name);

      if (entry.isDirectory()) {
        await collectEntryPaths(sourcePath, relativePath);
        await fsp.cp(sourcePath, targetPath, {
          force: true,
          recursive: true,
        });
      } else {
        installedPaths.add(relativePath);
        await fsp.cp(sourcePath, targetPath, {
          force: true,
        });
      }

      installedEntries.add(relativePath);
    }
  }

  return {
    headers: [...installedEntries].sort(),
    paths: [...installedPaths].sort(),
  };
}

/**
 * Downloads, extracts, installs, and records one GitHub-hosted header-only package.
 */
export async function getVCPkg(repoURL: string, options: GetPkgOptions = {}) {
  const repoPath = parseGitHubRepoPath(repoURL);
  const packageName = getPackageName(repoPath);
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "cppkg-cli-"));
  const archivePath = path.join(tempDir, `${packageName}.zip`);
  const extractPath = path.join(tempDir, "extract");
  const fullProject = Boolean(options.fullProject);

  try {
    const repository = await fetchRepository(repoPath, options);
    const release = fullProject
      ? null
      : await fetchLatestRelease(repoPath, options);
    const archive = fullProject
      ? pickRepositoryArchive(repoPath, repository)
      : release
        ? pickArchive(release)
        : pickRepositoryArchive(repoPath, repository);
    const installPath = fullProject
      ? path.join(getProjectsRootPath(), getProjectInstallDirName(repoPath))
      : getPublicIncludePath();

    console.log(
      fullProject
        ? `Resolving full project archive for ${repoPath}`
        : `Resolving latest headers for ${repoPath}`,
    );
    console.log(
      release
        ? `Using release ${release.tag_name || release.name || "latest"} (${archive.label})`
        : `Using repository archive from ${repository.default_branch} (${archive.label})`,
    );

    await downloadArchive(archive.url, archivePath, options);
    console.log("Download complete, extracting archive");

    await extractZipArchive(archivePath, extractPath);
    const sourceRootPath = await getPrimaryExtractedRoot(extractPath);

    if (fullProject) {
      const installed = await installWholeProject(sourceRootPath, installPath);
      const installedDependency = buildInstalledDependency(
        repoPath,
        installPath,
        release,
        archive,
        installed.headers,
        installed.paths,
        true,
      );

      await upsertInstalledDependency(installedDependency);

      console.log(
        `Installed full project ${packageName} into ${path.relative(process.cwd(), installPath)}`,
      );
      console.log(`Entries: ${installed.headers.join(", ")}`);
      console.log(
        `Recorded dependency metadata in ${path.relative(process.cwd(), path.join(getProjectsRootPath(), "..", "deps.json"))}`,
      );
      return;
    }

    const includeDirs = await collectIncludeDirs(sourceRootPath);

    if (!includeDirs.length) {
      throw new Error(
        "No usable include directory was found in the downloaded archive",
      );
    }

    const installed = await mergeIncludeDirs(includeDirs, installPath);
    const installedDependency = buildInstalledDependency(
      repoPath,
      installPath,
      release,
      archive,
      installed.headers,
      installed.paths,
      false,
    );

    await upsertInstalledDependency(installedDependency);

    console.log(
      `Installed ${packageName} into ${path.relative(process.cwd(), installPath)}`,
    );
    console.log(`Headers: ${installed.headers.join(", ")}`);
    console.log(
      `Recorded dependency metadata in ${path.relative(process.cwd(), path.join(installPath, "..", "deps.json"))}`,
    );
  } finally {
    await fsp.rm(tempDir, { force: true, recursive: true });
  }
}
