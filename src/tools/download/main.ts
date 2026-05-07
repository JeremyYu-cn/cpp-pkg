import type { GetPkgOptions } from "../../types/global";
import type {
  ArchiveDescriptor,
  ProviderRelease,
  ResolvedGiteeRepositoryInput,
  ResolvedGitHubRepositoryInput,
} from "./types";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareArchive } from "./archive";
import { installIncludePackage } from "./include";
import { installProjectPackage } from "./project";
import { logger } from "../logger";
import {
  fetchGiteeRepository,
  fetchGitHubRepository,
  fetchLatestGiteeRelease,
  fetchLatestGitHubRelease,
  pickGiteeReleaseArchive,
  pickGiteeRepositoryArchive,
  pickGitHubReleaseArchive,
  pickGitHubRepositoryArchive,
  resolveInputSource,
} from "./sources";

const VERSION_POLICIES = new Set([
  "default-branch",
  "latest-prerelease",
  "latest-release",
]);

type ReleaseBackedRepositoryContext<TRelease extends ProviderRelease> = {
  detectHeadersWithoutRelease?: boolean;
  inputSource: ResolvedGiteeRepositoryInput | ResolvedGitHubRepositoryInput;
  options: GetPkgOptions;
  packageName: string;
  release: TRelease | null;
  releaseArchive: (release: TRelease, options: GetPkgOptions) => ArchiveDescriptor;
  repoPath: string;
  repositoryArchive: ArchiveDescriptor;
  tempDir: string;
};

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
    return;
  }

  await installIncludePackage(inputSource, release, preparedHeaderArchive, options);
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
    if (inputSource.kind === "archive-url") {
      if (
        normalizedOptions.tag ||
        normalizedOptions.branch ||
        normalizedOptions.versionRange ||
        normalizedOptions.versionPolicy
      ) {
        if (!normalizedOptions.versionRange && !normalizedOptions.versionPolicy) {
          throw new Error(
            "Options --tag and --branch can only be used with GitHub or Gitee repository URLs.",
          );
        }

        throw new Error(
          "Options --tag, --branch, --version-range, and --version-policy can only be used with GitHub or Gitee repository URLs.",
        );
      }

      logger.info(`Resolving install mode for ${inputSource.repositoryUrl}`);
      logger.info(
        `No GitHub releases API is available for ${inputSource.repositoryUrl}, installing the archive as a full project`,
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
        return;
      }

      await installProjectPackage(inputSource, null, prepared, normalizedOptions);
      return;
    }

    if (inputSource.kind === "gitee-repository") {
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
      return;
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
  } finally {
    await fsp.rm(tempDir, { force: true, recursive: true });
  }
}
