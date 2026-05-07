import type { ProviderRelease } from "./types";

type SemanticVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

type VersionComparator = {
  operator: "<" | "<=" | "=" | ">=" | ">";
  version: SemanticVersion;
};

function parseSemanticVersion(value: string): SemanticVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u
    .exec(value.trim());

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function getReleaseVersion(release: ProviderRelease) {
  return parseSemanticVersion(release.tag_name || release.name || "");
}

function comparePrereleaseIdentifier(left: string, right: string) {
  const leftNumeric = /^\d+$/u.test(left);
  const rightNumeric = /^\d+$/u.test(right);

  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }

  if (leftNumeric) {
    return -1;
  }

  if (rightNumeric) {
    return 1;
  }

  return left.localeCompare(right);
}

function compareSemanticVersions(left: SemanticVersion, right: SemanticVersion) {
  const coreDifference =
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch;

  if (coreDifference !== 0) {
    return coreDifference;
  }

  if (!left.prerelease.length && !right.prerelease.length) {
    return 0;
  }

  if (!left.prerelease.length) {
    return 1;
  }

  if (!right.prerelease.length) {
    return -1;
  }

  const length = Math.max(left.prerelease.length, right.prerelease.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];

    if (leftPart === undefined) {
      return -1;
    }

    if (rightPart === undefined) {
      return 1;
    }

    const difference = comparePrereleaseIdentifier(leftPart, rightPart);

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function incrementVersion(
  version: SemanticVersion,
  field: "major" | "minor" | "patch",
): SemanticVersion {
  if (field === "major") {
    return {
      major: version.major + 1,
      minor: 0,
      patch: 0,
      prerelease: [],
    };
  }

  if (field === "minor") {
    return {
      major: version.major,
      minor: version.minor + 1,
      patch: 0,
      prerelease: [],
    };
  }

  return {
    major: version.major,
    minor: version.minor,
    patch: version.patch + 1,
    prerelease: [],
  };
}

function wildcardComparators(value: string): VersionComparator[] | null {
  const match = /^v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/iu.exec(value);

  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  const minor = match[2];
  const patch = match[3];

  if (minor === undefined || /^[x*]$/iu.test(minor)) {
    const min = { major, minor: 0, patch: 0, prerelease: [] };

    return [
      { operator: ">=", version: min },
      { operator: "<", version: incrementVersion(min, "major") },
    ];
  }

  if (patch === undefined || /^[x*]$/iu.test(patch)) {
    const min = {
      major,
      minor: Number(minor),
      patch: 0,
      prerelease: [],
    };

    return [
      { operator: ">=", version: min },
      { operator: "<", version: incrementVersion(min, "minor") },
    ];
  }

  return null;
}

function caretComparators(version: SemanticVersion): VersionComparator[] {
  const upperBound = version.major > 0
    ? incrementVersion(version, "major")
    : version.minor > 0
      ? incrementVersion(version, "minor")
      : incrementVersion(version, "patch");

  return [
    { operator: ">=", version },
    { operator: "<", version: upperBound },
  ];
}

function tildeComparators(version: SemanticVersion): VersionComparator[] {
  return [
    { operator: ">=", version },
    { operator: "<", version: incrementVersion(version, "minor") },
  ];
}

function parseComparator(value: string): VersionComparator[] {
  const wildcard = wildcardComparators(value);

  if (wildcard) {
    return wildcard;
  }

  const rangeMatch = /^(<=|>=|<|>|=)?\s*(v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/u
    .exec(value);

  if (!rangeMatch) {
    throw new Error(`Unsupported version range comparator: ${value}`);
  }

  const version = parseSemanticVersion(rangeMatch[2]!);

  if (!version) {
    throw new Error(`Unsupported version range comparator: ${value}`);
  }

  return [
    {
      operator: (rangeMatch[1] || "=") as VersionComparator["operator"],
      version,
    },
  ];
}

function parseVersionRange(range: string): VersionComparator[] {
  const normalized = range.trim();

  if (!normalized) {
    throw new Error("Option --version-range cannot be empty.");
  }

  if (normalized.startsWith("^")) {
    const version = parseSemanticVersion(normalized.slice(1));

    if (!version) {
      throw new Error(`Unsupported version range: ${range}`);
    }

    return caretComparators(version);
  }

  if (normalized.startsWith("~")) {
    const version = parseSemanticVersion(normalized.slice(1));

    if (!version) {
      throw new Error(`Unsupported version range: ${range}`);
    }

    return tildeComparators(version);
  }

  return normalized.split(/\s+/u).flatMap(parseComparator);
}

function satisfiesComparator(
  version: SemanticVersion,
  comparator: VersionComparator,
) {
  const difference = compareSemanticVersions(version, comparator.version);

  switch (comparator.operator) {
    case "<":
      return difference < 0;
    case "<=":
      return difference <= 0;
    case "=":
      return difference === 0;
    case ">":
      return difference > 0;
    case ">=":
      return difference >= 0;
  }
}

export function releaseSatisfiesVersionRange(
  release: ProviderRelease,
  range: string,
  includePrerelease = false,
) {
  const version = getReleaseVersion(release);

  if (!version) {
    return false;
  }

  if (version.prerelease.length && !includePrerelease) {
    return false;
  }

  return parseVersionRange(range).every((comparator) =>
    satisfiesComparator(version, comparator),
  );
}

export function pickReleaseByVersionRange<TRelease extends ProviderRelease>(
  releases: TRelease[],
  range: string,
  includePrerelease = false,
) {
  return releases
    .map((release) => ({ release, version: getReleaseVersion(release) }))
    .filter((entry): entry is { release: TRelease; version: SemanticVersion } =>
      Boolean(entry.version) &&
      (!entry.version?.prerelease.length || includePrerelease) &&
      releaseSatisfiesVersionRange(entry.release, range, includePrerelease),
    )
    .sort((left, right) => compareSemanticVersions(right.version, left.version))[0]
    ?.release ?? null;
}
