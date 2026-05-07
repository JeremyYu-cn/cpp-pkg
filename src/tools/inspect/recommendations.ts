import type { PackageRecommendation } from "./types";
import { normalizeIncludePath } from "./path";

type IncludeRecommendationRule = Omit<PackageRecommendation, "reason"> & {
  matches: (includePath: string) => boolean;
};

function matchesPrefix(prefix: string) {
  const normalizedPrefix = normalizeIncludePath(prefix).toLowerCase();

  return (includePath: string) => {
    const normalized = normalizeIncludePath(includePath).toLowerCase();

    return normalized === normalizedPrefix ||
      normalized.startsWith(`${normalizedPrefix}/`);
  };
}

function matchesExact(value: string) {
  const normalizedValue = normalizeIncludePath(value).toLowerCase();

  return (includePath: string) =>
    normalizeIncludePath(includePath).toLowerCase() === normalizedValue;
}

const INCLUDE_RECOMMENDATIONS: IncludeRecommendationRule[] = [
  {
    matches: matchesPrefix("fmt"),
    name: "fmt",
    source: "https://github.com/fmtlib/fmt",
  },
  {
    matches: matchesPrefix("nlohmann"),
    name: "json",
    source: "https://github.com/nlohmann/json",
  },
  {
    matches: matchesPrefix("boost"),
    name: "boost",
    source: "https://github.com/boostorg/boost",
  },
  {
    matches: matchesPrefix("catch2"),
    name: "catch2",
    source: "https://github.com/catchorg/Catch2",
  },
  {
    matches: (includePath) =>
      matchesPrefix("gtest")(includePath) || matchesPrefix("gmock")(includePath),
    name: "googletest",
    source: "https://github.com/google/googletest",
  },
  {
    matches: matchesPrefix("spdlog"),
    name: "spdlog",
    source: "https://github.com/gabime/spdlog",
  },
  {
    matches: matchesPrefix("glm"),
    name: "glm",
    source: "https://github.com/g-truc/glm",
  },
  {
    matches: matchesPrefix("doctest"),
    name: "doctest",
    source: "https://github.com/doctest/doctest",
  },
  {
    matches: matchesPrefix("yaml-cpp"),
    name: "yaml-cpp",
    source: "https://github.com/jbeder/yaml-cpp",
  },
  {
    matches: matchesPrefix("cpr"),
    name: "cpr",
    source: "https://github.com/libcpr/cpr",
  },
  {
    matches: matchesPrefix("range/v3"),
    name: "range-v3",
    source: "https://github.com/ericniebler/range-v3",
  },
  {
    matches: (includePath) =>
      matchesPrefix("CLI")(includePath) || matchesPrefix("CLI11")(includePath),
    name: "cli11",
    source: "https://github.com/CLIUtils/CLI11",
  },
  {
    matches: (includePath) =>
      matchesExact("imgui.h")(includePath) || matchesPrefix("imgui")(includePath),
    name: "imgui",
    source: "https://github.com/ocornut/imgui",
  },
  {
    matches: matchesPrefix("magic_enum"),
    name: "magic_enum",
    source: "https://github.com/Neargye/magic_enum",
  },
  {
    matches: matchesExact("httplib.h"),
    name: "cpp-httplib",
    source: "https://github.com/yhirose/cpp-httplib",
  },
  {
    matches: matchesExact("sqlite3.h"),
    name: "sqlite",
    source: "https://github.com/sqlite/sqlite",
  },
  {
    matches: matchesPrefix("curl"),
    name: "curl",
    source: "https://github.com/curl/curl",
  },
  {
    matches: matchesPrefix("openssl"),
    name: "openssl",
    source: "https://github.com/openssl/openssl",
  },
];

export function getIncludePackageRecommendation(
  includePaths: string[],
): PackageRecommendation | undefined {
  for (const rule of INCLUDE_RECOMMENDATIONS) {
    const matchingInclude = includePaths.find((includePath) =>
      rule.matches(includePath),
    );

    if (matchingInclude) {
      return {
        name: rule.name,
        reason: `matched ${matchingInclude}`,
        source: rule.source,
      };
    }
  }

  return undefined;
}
