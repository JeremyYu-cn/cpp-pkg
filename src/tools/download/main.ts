import type { GetPkgOptions } from "../../types/global";
import type {
  ArchiveDescriptor,
  ProviderRelease,
  ResolvedBitbucketRepositoryInput,
  ResolvedGiteeRepositoryInput,
  ResolvedGitHubRepositoryInput,
  ResolvedGitLabRepositoryInput,
  ResolvedInputSource,
} from "./types";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { prepareArchive } from "./archive";
import { installIncludePackage } from "./include";
import { installProjectPackage } from "./project";
import { installBinaryPackage } from "./binary";
import { logger } from "../logger";
import {
  fetchBitbucketRepository,
  fetchGiteeRepository,
  fetchGitHubRepository,
  fetchGitLabRepository,
  fetchLatestBitbucketRelease,
  fetchLatestGiteeRelease,
  fetchLatestGitHubRelease,
  fetchLatestGitLabRelease,
  pickBitbucketReleaseArchive,
  pickBitbucketRepositoryArchive,
  pickGiteeReleaseArchive,
  pickGiteeRepositoryArchive,
  pickGitHubReleaseArchive,
  pickGitHubRepositoryArchive,
  pickGitLabReleaseArchive,
  pickGitLabRepositoryArchive,
  resolveInputSource,
} from "./sources";
import { isArchiveInCache } from "./offline";
import { resolveTransitiveDependencies } from "./transitive";
import { upsertDependencyTransitiveDeps } from "../deps";

const VERSION_POLICIES = new Set([
  "default-branch",
  "latest-prerelease",
  "latest-release",
]);

type ReleaseBackedRepositoryContext<TRelease extends ProviderRelease> = {
  detectHeadersWithoutRelease?: boolean;
  inputSource:
    | ResolvedBitbucketRepositoryInput
    | ResolvedGiteeRepositoryInput
    | ResolvedGitHubRepositoryInput
    | ResolvedGitLabRepositoryInput;
  options: GetPkgOptions;
  packageName: string;
  release: TRelease | null;
  releaseArchive: (release: TRelease, options: GetPkgOptions) => ArchiveDescriptor;
  repoPath: string;
  repositoryArchive: ArchiveDescriptor;
  tempDir: string;
};

async function resolveTransitiveAfterProjectInstall(
  inputSource: ResolvedInputSource,
  normalizedOptions: GetPkgOptions,
) {
  if (normalizedOptions.transitive === false) {
    return;
  }

  const visited = new Set<string>();
  const rootUrl = inputSource.repositoryUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.git$/i, "")
    .toLowerCase();

  visited.add(rootUrl);

  logger.info(
    `Checking for transitive dependencies in ${inputSource.packageName}`,
  );

  const result = await resolveTransitiveDependencies(
    inputSource.repositoryUrl,
    normalizedOptions,
    visited,
    (source, opts) => getVCPkg(source, opts),
  );

  if (result.relations.size > 0) {
    const installed = await upsertDependencyTransitiveDeps(result.relations);

    if (installed) {
      logger.success(
        `Resolved ${installed} transitive package(s)`,
      );
    }
  }
}

function normalizeRefOption(value: string | undefined, optionName: string) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Option --${optionName} cannot be empty.`);
  }

  return normalized;
}

function normalizeVersionPolicy(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!VERSION_POLICIES.has(normalized)) {
    throw new Error(
      `Option --version-policy must be one of: ${[...VERSION_POLICIES].join(", ")}.`,
    );
  }

  return normalized as GetPkgOptions["versionPolicy"];
}

function normalizeRelativeArchivePath(value: string, optionName: string) {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\.\/+/, "")
    .replace(/\/+$/, "");

  if (!normalized) {
    throw new Error(`Option --${optionName} cannot be empty.`);
  }

  if (path.posix.isAbsolute(normalized)) {
    throw new Error(`Option --${optionName} must be a relative archive path.`);
  }

  const segments = normalized.split("/").filter(Boolean);

  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Option --${optionName} must stay inside the archive root.`);
  }

  return segments.join("/");
}

function normalizeProjectRelativePath(value: string, optionName: string) {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\.\/+/, "")
    .replace(/\/+$/, "");

  if (!normalized) {
    throw new Error(`Option --${optionName} cannot be empty.`);
  }

  if (path.isAbsolute(normalized)) {
    throw new Error(`Option --${optionName} must be a relative project path.`);
  }

  const segments = normalized.split("/").filter(Boolean);

  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Option --${optionName} must stay inside the current project.`);
  }

  return segments.join("/");
}

function normalizeComponentName(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Option --component cannot be empty.");
  }

  if (normalized.includes("/") || normalized.includes("\\")) {
    throw new Error("Option --component must be a top-level entry name.");
  }

  return normalized;
}

function normalizeStringList(
  value: string | string[] | undefined,
  optionName: string,
  normalize: (entry: string, optionName: string) => string,
) {
  const rawValues = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const normalized = rawValues.map((entry) => normalize(entry, optionName));

  return [...new Set(normalized)];
}

function normalizeChecksum(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/^sha256[:=-]/i, "");

  if (!/^[a-f0-9]{64}$/u.test(normalized)) {
    throw new Error("Option --checksum must be a SHA-256 hex digest.");
  }

  return normalized;
}

function normalizeGetPkgOptions(options: GetPkgOptions) {
  const tag = normalizeRefOption(options.tag, "tag");
  const branch = normalizeRefOption(options.branch, "branch");
  const versionRange = normalizeRefOption(
    options.versionRange,
    "version-range",
  );
  const versionPolicy = normalizeVersionPolicy(options.versionPolicy);
  const includePath = normalizeStringList(
    options.includePath,
    "include-path",
    normalizeRelativeArchivePath,
  );
  const patches = normalizeStringList(
    options.patches,
    "patch",
    normalizeProjectRelativePath,
  );
  const components = normalizeStringList(
    options.components,
    "component",
    (entry) => normalizeComponentName(entry),
  );
  const stripPrefix = options.stripPrefix === undefined
    ? undefined
    : normalizeRelativeArchivePath(options.stripPrefix, "strip-prefix");
  const checksum = normalizeChecksum(options.checksum);
  const normalizedOptions: GetPkgOptions = { ...options };

  const explicitStrategies = [
    tag,
    branch,
    versionRange,
    versionPolicy === "default-branch" ? versionPolicy : undefined,
  ].filter(Boolean);

  if (tag && branch && explicitStrategies.length === 2) {
    throw new Error("Options --tag and --branch cannot be used together.");
  }

  if (explicitStrategies.length > 1) {
    throw new Error(
      "Options --tag, --branch, --version-range, and --version-policy default-branch cannot be used together.",
    );
  }

  if (tag) {
    normalizedOptions.tag = tag;
  } else {
    delete normalizedOptions.tag;
  }

  if (branch) {
    normalizedOptions.branch = branch;
  } else {
    delete normalizedOptions.branch;
  }

  if (versionRange) {
    normalizedOptions.versionRange = versionRange;
  } else {
    delete normalizedOptions.versionRange;
  }

  if (versionPolicy) {
    normalizedOptions.versionPolicy = versionPolicy;

    if (versionPolicy === "latest-prerelease") {
      normalizedOptions.prerelease = true;
    }
  } else {
    delete normalizedOptions.versionPolicy;
  }

  if (includePath.length) {
    normalizedOptions.includePath = includePath;
  } else {
    delete normalizedOptions.includePath;
  }

  if (patches.length) {
    normalizedOptions.patches = patches;
  } else {
    delete normalizedOptions.patches;
  }

  if (components.length) {
    normalizedOptions.components = components;
  } else {
    delete normalizedOptions.components;
  }

  if (stripPrefix) {
    normalizedOptions.stripPrefix = stripPrefix;
  } else {
    delete normalizedOptions.stripPrefix;
  }

  if (checksum) {
    normalizedOptions.checksum = checksum;
  } else {
    delete normalizedOptions.checksum;
  }

  if (options.binary) {
    const rawBinary = options.binary;

    if (typeof rawBinary === "string") {
      const parts = rawBinary.trim().split("/").filter(Boolean);
      const platform = parts[0];
      const arch = parts[1];

      if (!platform) {
        throw new Error("Option --binary cannot be empty.");
      }

      if (arch) {
        normalizedOptions.binary = { platform, arch };
      } else {
        normalizedOptions.binary = { platform };
      }
    } else if (typeof rawBinary === "object") {
      const result: NonNullable<GetPkgOptions["binary"]> = {};

      if (rawBinary.platform) result.platform = rawBinary.platform;
      if (rawBinary.arch) result.arch = rawBinary.arch;
      if (rawBinary.pattern) result.pattern = rawBinary.pattern;

      normalizedOptions.binary = result;
    } else {
      normalizedOptions.binary = {};
    }
  } else {
    delete normalizedOptions.binary;
  }

  normalizedOptions.transitive = options.transitive !== false;

  return normalizedOptions;
}

/**
 * Finds the first archive candidate that contains a usable include directory.
 */
async function selectHeaderArchive(
  tempDir: string,
  packageName: string,
  archives: ArchiveDescriptor[],
  options: GetPkgOptions = {},
) {
  const attemptedArchiveURLs = new Set<string>();
  let attemptIndex = 0;

  for (const archive of archives) {
    if (attemptedArchiveURLs.has(archive.url)) {
      continue;
    }

    attemptedArchiveURLs.add(archive.url);

    const prepared = await prepareArchive(
      tempDir,
      packageName,
      archive,
      `probe-${attemptIndex}`,
      options,
    );

    attemptIndex += 1;

    if (prepared.includeDirs.length) {
      return prepared;
    }
  }

  return null;
}

/**
 * Handles one repository source that may resolve to either header installation or full project installation.
 */
async function installReleaseAwareRepository<TRelease extends ProviderRelease>(
  context: ReleaseBackedRepositoryContext<TRelease>,
) {
  const {
    detectHeadersWithoutRelease = false,
    inputSource,
    options,
    packageName,
    release,
    releaseArchive,
    repoPath,
    repositoryArchive,
    tempDir,
  } = context;

  logger.info(`Resolving install mode for ${repoPath}`);

  if (options.binary) {
    logger.info(
      `Binary install enabled for ${repoPath}, placing binaries in bin directory`,
    );

    const prepared = await prepareArchive(
      tempDir,
      packageName,
      repositoryArchive,
      "binary",
      options,
    );
    await installBinaryPackage(inputSource, release, prepared, options);
    return;
  }

  if (options.fullProject) {
    logger.info(
      `Forced full-project install enabled for ${repoPath}, skipping include-directory detection`,
    );

    const prepared = await prepareArchive(
      tempDir,
      packageName,
      repositoryArchive,
      "project",
      options,
    );
    await installProjectPackage(inputSource, release, prepared, options);
    await resolveTransitiveAfterProjectInstall(inputSource, options);
    return;
  }

  if (!release) {
    const repositoryArchiveRef = repositoryArchive.label.replace(/\.zip$/i, "");

    if (options.branch) {
      logger.info(
        `Installing ${repoPath} from branch ${repositoryArchiveRef}`,
      );
    } else if (options.tag) {
      logger.warn(
        `No release found for tag ${options.tag}, installing the repository archive for ${repositoryArchiveRef}`,
      );
    } else {
      logger.warn(
        `No published release found for ${repoPath}, installing the repository archive from ${repositoryArchiveRef}`,
      );
    }

    const preparedHeaderArchive = detectHeadersWithoutRelease || options.includePath
      ? await selectHeaderArchive(
          tempDir,
          packageName,
          [repositoryArchive],
          options,
        )
      : null;

    if (preparedHeaderArchive) {
      await installIncludePackage(
        inputSource,
        null,
        preparedHeaderArchive,
        options,
      );
      return;
    }

    const prepared = await prepareArchive(
      tempDir,
      packageName,
      repositoryArchive,
      "project",
      options,
    );
    await installProjectPackage(inputSource, null, prepared, options);
    await resolveTransitiveAfterProjectInstall(inputSource, options);
    return;
  }

  logger.info(
    `Found release ${release.tag_name || release.name || "latest"}, installing reusable headers`,
  );

  const preparedHeaderArchive = await selectHeaderArchive(
    tempDir,
    packageName,
    [releaseArchive(release, options), repositoryArchive],
    options,
  );

  if (!preparedHeaderArchive) {
    const prepared = await prepareArchive(
      tempDir,
      packageName,
      repositoryArchive,
      "project",
      options,
    );
    await installProjectPackage(inputSource, release, prepared, options);
    await resolveTransitiveAfterProjectInstall(inputSource, options);
    return;
  }

  await installIncludePackage(inputSource, release, preparedHeaderArchive, options);
}

/**
 * Executes post-install hooks defined in the dependency manifest.
 */
function runPostinstallHooks(options: GetPkgOptions) {
  const commands = options.hooks?.postinstall;

  if (!commands) return;

  const commandList = Array.isArray(commands) ? commands : [commands];

  if (!commandList.length) return;

  logger.info("Running post-install hooks");

  for (const command of commandList) {
    const trimmed = command.trim();

    if (!trimmed) continue;

    logger.progress(`Executing: ${trimmed}`);
    execSync(trimmed, { cwd: process.cwd(), stdio: "inherit" });
  }

  logger.success("Post-install hooks completed");
}

/**
 * Downloads, extracts, installs, and records one GitHub-hosted or direct-archive C/C++ package.
 */
export async function getVCPkg(repoURL: string, options: GetPkgOptions = {}) {
  const normalizedOptions = normalizeGetPkgOptions(options);
  const inputSource = resolveInputSource(repoURL);
  const packageName = inputSource.packageName;
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "cppkg-cli-"));

  try {
    if (normalizedOptions.offline) {
      logger.info("Offline mode: checking local cache for archive");

      if (inputSource.kind === "archive-url") {
        if (!isArchiveInCache(inputSource.archive)) {
          throw new Error(
            `Package not available offline. Run without --offline to download.`,
          );
        }
      }
    }

    if (inputSource.kind === "archive-url") {
      if (
        normalizedOptions.tag ||
        normalizedOptions.branch ||
        normalizedOptions.versionRange ||
        normalizedOptions.versionPolicy
      ) {
        if (!normalizedOptions.versionRange && !normalizedOptions.versionPolicy) {
          throw new Error(
            "Options --tag and --branch can only be used with GitHub, Gitee, GitLab, or Bitbucket repository URLs.",
          );
        }

        throw new Error(
          "Options --tag, --branch, --version-range, and --version-policy can only be used with GitHub, Gitee, GitLab, or Bitbucket repository URLs.",
        );
      }

      logger.info(`Resolving install mode for ${inputSource.repositoryUrl}`);

      if (normalizedOptions.binary) {
        logger.info(
          `Binary install enabled for ${inputSource.repositoryUrl}, placing binaries in bin directory`,
        );

        const prepared = await prepareArchive(
          tempDir,
          packageName,
          inputSource.archive,
          "binary",
          normalizedOptions,
        );
        await installBinaryPackage(inputSource, null, prepared, normalizedOptions);
        return;
      }

      logger.info(
        `No releases API is available for ${inputSource.repositoryUrl}, installing the archive as a full project`,
      );

      const prepared = await prepareArchive(
        tempDir,
        packageName,
        inputSource.archive,
        "project",
        normalizedOptions,
      );

      if (!normalizedOptions.fullProject && normalizedOptions.includePath) {
        await installIncludePackage(inputSource, null, prepared, normalizedOptions);
        runPostinstallHooks(normalizedOptions);
        return;
      }

      await installProjectPackage(inputSource, null, prepared, normalizedOptions);
      await resolveTransitiveAfterProjectInstall(inputSource, normalizedOptions);
      runPostinstallHooks(normalizedOptions);
      return;
    }

    if (inputSource.kind === "gitee-repository") {
      if (normalizedOptions.offline) {
        const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;
        const repoArchive = pickGiteeRepositoryArchive(
          inputSource.repositoryPath,
          { default_branch: repositoryRef || "master", full_name: inputSource.repositoryPath, html_url: inputSource.repositoryUrl },
          repositoryRef,
        );

        if (!isArchiveInCache(repoArchive)) {
          throw new Error(
            `Package not available offline. Run without --offline to download.`,
          );
        }
      }

      const repository = await fetchGiteeRepository(
        inputSource.repositoryPath,
        normalizedOptions,
      );
      const release = normalizedOptions.branch ||
          normalizedOptions.versionPolicy === "default-branch"
        ? null
        : await fetchLatestGiteeRelease(
            inputSource.repositoryPath,
            normalizedOptions,
          );
      const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;

      await installReleaseAwareRepository({
        detectHeadersWithoutRelease: Boolean(
          repositoryRef || normalizedOptions.versionPolicy === "default-branch",
        ),
        inputSource,
        options: normalizedOptions,
        packageName,
        release,
        releaseArchive: (nextRelease) =>
          pickGiteeReleaseArchive(inputSource.repositoryPath, nextRelease),
        repoPath: inputSource.repositoryPath,
        repositoryArchive: pickGiteeRepositoryArchive(
          inputSource.repositoryPath,
          repository,
          repositoryRef,
        ),
        tempDir,
      });
      runPostinstallHooks(normalizedOptions);
      return;
    }

    if (inputSource.kind === "gitlab-repository") {
      if (normalizedOptions.offline) {
        const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;
        const repoArchive = pickGitLabRepositoryArchive(
          inputSource.repositoryPath,
          { default_branch: repositoryRef || "main", path_with_namespace: inputSource.repositoryPath, web_url: inputSource.repositoryUrl },
          repositoryRef,
        );

        if (!isArchiveInCache(repoArchive)) {
          throw new Error(
            `Package not available offline. Run without --offline to download.`,
          );
        }
      }

      const repository = await fetchGitLabRepository(
        inputSource.repositoryPath,
        normalizedOptions,
      );
      const release = normalizedOptions.branch ||
          normalizedOptions.versionPolicy === "default-branch"
        ? null
        : await fetchLatestGitLabRelease(
            inputSource.repositoryPath,
            normalizedOptions,
          );
      const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;

      await installReleaseAwareRepository({
        detectHeadersWithoutRelease: Boolean(
          repositoryRef || normalizedOptions.versionPolicy === "default-branch",
        ),
        inputSource,
        options: normalizedOptions,
        packageName,
        release,
        releaseArchive: () =>
          pickGitLabReleaseArchive(inputSource.repositoryPath, release!),
        repoPath: inputSource.repositoryPath,
        repositoryArchive: pickGitLabRepositoryArchive(
          inputSource.repositoryPath,
          repository,
          repositoryRef,
        ),
        tempDir,
      });
      runPostinstallHooks(normalizedOptions);
      return;
    }

    if (inputSource.kind === "bitbucket-repository") {
      if (normalizedOptions.offline) {
        const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;
        const repoArchive = pickBitbucketRepositoryArchive(
          inputSource.repositoryPath,
          {
            mainbranch: { name: repositoryRef || "main" },
            full_name: inputSource.repositoryPath,
            links: { html: { href: inputSource.repositoryUrl } },
          },
          repositoryRef,
        );

        if (!isArchiveInCache(repoArchive)) {
          throw new Error(
            `Package not available offline. Run without --offline to download.`,
          );
        }
      }

      const repository = await fetchBitbucketRepository(
        inputSource.repositoryPath,
        normalizedOptions,
      );
      const release = normalizedOptions.branch ||
          normalizedOptions.versionPolicy === "default-branch"
        ? null
        : await fetchLatestBitbucketRelease(
            inputSource.repositoryPath,
            normalizedOptions,
          );
      const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;

      await installReleaseAwareRepository({
        detectHeadersWithoutRelease: Boolean(
          repositoryRef || normalizedOptions.versionPolicy === "default-branch",
        ),
        inputSource,
        options: normalizedOptions,
        packageName,
        release,
        releaseArchive: () =>
          pickBitbucketReleaseArchive(inputSource.repositoryPath, release!),
        repoPath: inputSource.repositoryPath,
        repositoryArchive: pickBitbucketRepositoryArchive(
          inputSource.repositoryPath,
          repository,
          repositoryRef,
        ),
        tempDir,
      });
      runPostinstallHooks(normalizedOptions);
      return;
    }

    if (inputSource.kind === "github-repository") {
    if (normalizedOptions.offline) {
      const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;
      const repoArchive = pickGitHubRepositoryArchive(
        inputSource.repositoryPath,
        { default_branch: repositoryRef || "main", full_name: inputSource.repositoryPath, html_url: inputSource.repositoryUrl },
        repositoryRef,
      );

      if (!isArchiveInCache(repoArchive)) {
        throw new Error(
          `Package not available offline. Run without --offline to download.`,
        );
      }
    }

    const repository = await fetchGitHubRepository(
      inputSource.repositoryPath,
      normalizedOptions,
    );
    const release = normalizedOptions.branch ||
        normalizedOptions.versionPolicy === "default-branch"
      ? null
      : await fetchLatestGitHubRelease(
          inputSource.repositoryPath,
          normalizedOptions,
        );
    const repositoryRef = normalizedOptions.branch || normalizedOptions.tag;

    await installReleaseAwareRepository({
      detectHeadersWithoutRelease: Boolean(
        repositoryRef || normalizedOptions.versionPolicy === "default-branch",
      ),
      inputSource,
      options: normalizedOptions,
      packageName,
      release,
      releaseArchive: pickGitHubReleaseArchive,
      repoPath: inputSource.repositoryPath,
      repositoryArchive: pickGitHubRepositoryArchive(
        inputSource.repositoryPath,
        repository,
        repositoryRef,
      ),
      tempDir,
    });
    runPostinstallHooks(normalizedOptions);
    }
  } finally {
    await fsp.rm(tempDir, { force: true, recursive: true });
  }
}
