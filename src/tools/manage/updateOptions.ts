import type { GetPkgOptions, InstalledDependency } from "../../types/global";

export function hasExplicitVersionOption(options: GetPkgOptions) {
  return Boolean(
    options.tag ||
    options.branch ||
    options.versionRange ||
    options.versionPolicy,
  );
}

export function getUpdatedPackageOptions(
  dependency: InstalledDependency,
  options: GetPkgOptions,
) {
  const updatedOptions: GetPkgOptions = {
    ...options,
    fullProject: options.fullProject || dependency.install.mode === "full-project",
  };
  const requested = dependency.source.requested;

  if (options.tag) {
    updatedOptions.tag = options.tag;
    delete updatedOptions.branch;
    delete updatedOptions.versionPolicy;
    delete updatedOptions.versionRange;
    return updatedOptions;
  }

  if (options.branch) {
    updatedOptions.branch = options.branch;
    delete updatedOptions.tag;
    delete updatedOptions.versionPolicy;
    delete updatedOptions.versionRange;
    return updatedOptions;
  }

  if (options.versionRange) {
    updatedOptions.versionRange = options.versionRange;
    delete updatedOptions.branch;
    delete updatedOptions.tag;
    delete updatedOptions.versionPolicy;
    return updatedOptions;
  }

  if (options.versionPolicy) {
    updatedOptions.versionPolicy = options.versionPolicy;
    delete updatedOptions.branch;
    delete updatedOptions.tag;
    delete updatedOptions.versionRange;
    return updatedOptions;
  }

  if (requested?.type === "tag" && requested.value) {
    updatedOptions.tag = requested.value;
    delete updatedOptions.branch;
    delete updatedOptions.versionPolicy;
    delete updatedOptions.versionRange;
  } else if (requested?.type === "branch" && requested.value) {
    updatedOptions.branch = requested.value;
    delete updatedOptions.tag;
    delete updatedOptions.versionPolicy;
    delete updatedOptions.versionRange;
  } else if (requested?.type === "version-range" && requested.value) {
    updatedOptions.versionRange = requested.value;
    delete updatedOptions.branch;
    delete updatedOptions.tag;
    delete updatedOptions.versionPolicy;
  } else if (requested?.type === "default-branch") {
    updatedOptions.versionPolicy = "default-branch";
    delete updatedOptions.branch;
    delete updatedOptions.tag;
    delete updatedOptions.versionRange;
  }

  if (requested?.includePrerelease && options.prerelease === undefined) {
    updatedOptions.prerelease = true;
  }

  if (options.includePath === undefined && requested?.includePath?.length) {
    updatedOptions.includePath = requested.includePath;
  }

  if (options.stripPrefix === undefined && requested?.stripPrefix) {
    updatedOptions.stripPrefix = requested.stripPrefix;
  }

  if (options.patches === undefined && requested?.patches?.length) {
    updatedOptions.patches = requested.patches;
  }

  if (options.components === undefined && requested?.components?.length) {
    updatedOptions.components = requested.components;
  }

  if (options.checksum === undefined && requested?.checksum) {
    updatedOptions.checksum = requested.checksum;
  }

  return updatedOptions;
}
