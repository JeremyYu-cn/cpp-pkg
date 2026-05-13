import fs from "node:fs";
import type { ManifestDependency } from "../public/manifest";

export const KNOWN_PACKAGE_SOURCES: Record<string, string> = {
  "abseil": "https://github.com/abseil/abseil-cpp",
  "abseil-cpp": "https://github.com/abseil/abseil-cpp",
  "asio": "https://github.com/chriskohlhoff/asio",
  "benchmark": "https://github.com/google/benchmark",
  "boost": "https://github.com/boostorg/boost",
  "boost-algorithm": "https://github.com/boostorg/algorithm",
  "boost-asio": "https://github.com/boostorg/asio",
  "boost-beast": "https://github.com/boostorg/beast",
  "boost-filesystem": "https://github.com/boostorg/filesystem",
  "boost-json": "https://github.com/boostorg/json",
  "boost-program-options": "https://github.com/boostorg/program_options",
  "boost-system": "https://github.com/boostorg/system",
  "boost-test": "https://github.com/boostorg/test",
  "boost-thread": "https://github.com/boostorg/thread",
  "boost-url": "https://github.com/boostorg/url",
  "catch2": "https://github.com/catchorg/Catch2",
  "cereal": "https://github.com/USCiLab/cereal",
  "cli11": "https://github.com/CLIUtils/CLI11",
  "cpp-httplib": "https://github.com/yhirose/cpp-httplib",
  "cpptoml": "https://github.com/skystrife/cpptoml",
  "cpr": "https://github.com/libcpr/cpr",
  "cryptopp": "https://github.com/weidai11/cryptopp",
  "curl": "https://github.com/curl/curl",
  "daw-json-link": "https://github.com/beached/daw_json_link",
  "doctest": "https://github.com/doctest/doctest",
  "eastl": "https://github.com/electronicarts/EASTL",
  "eigen": "https://github.com/PX4/eigen",
  "eigen3": "https://github.com/PX4/eigen",
  "entt": "https://github.com/skypjack/entt",
  "expected": "https://github.com/TartanLlama/expected",
  "fast-cpp-csv-parser": "https://github.com/ben-strasser/fast-cpp-csv-parser",
  "fmt": "https://github.com/fmtlib/fmt",
  "fmtlib": "https://github.com/fmtlib/fmt",
  "glfw": "https://github.com/glfw/glfw",
  "glm": "https://github.com/g-truc/glm",
  "glog": "https://github.com/google/glog",
  "gmp": "https://github.com/alisw/GMP",
  "googletest": "https://github.com/google/googletest",
  "grpc": "https://github.com/grpc/grpc",
  "gsl": "https://github.com/microsoft/GSL",
  "gtest": "https://github.com/google/googletest",
  "icu": "https://github.com/unicode-org/icu",
  "imgui": "https://github.com/ocornut/imgui",
  "json": "https://github.com/nlohmann/json",
  "jsoncpp": "https://github.com/open-source-parsers/jsoncpp",
  "libevent": "https://github.com/libevent/libevent",
  "libgit2": "https://github.com/libgit2/libgit2",
  "libjpeg-turbo": "https://github.com/libjpeg-turbo/libjpeg-turbo",
  "libpng": "https://github.com/pnggroup/libpng",
  "libsodium": "https://github.com/jedisct1/libsodium",
  "libuv": "https://github.com/libuv/libuv",
  "libxml2": "https://github.com/GNOME/libxml2",
  "lz4": "https://github.com/lz4/lz4",
  "magic-enum": "https://github.com/Neargye/magic_enum",
  "ms-gsl": "https://github.com/microsoft/GSL",
  "nameof": "https://github.com/Neargye/nameof",
  "nanobind": "https://github.com/wjakob/nanobind",
  "nanorange": "https://github.com/tcbrindle/NanoRange",
  "nlohmann_json": "https://github.com/nlohmann/json",
  "nlohmann-json": "https://github.com/nlohmann/json",
  "opencl": "https://github.com/KhronosGroup/OpenCL-Headers",
  "opencv": "https://github.com/opencv/opencv",
  "openexr": "https://github.com/AcademySoftwareFoundation/openexr",
  "openmp": "https://github.com/llvm/llvm-project",
  "openssl": "https://github.com/openssl/openssl",
  "openvdb": "https://github.com/AcademySoftwareFoundation/openvdb",
  "poco": "https://github.com/pocoproject/poco",
  "protobuf": "https://github.com/protocolbuffers/protobuf",
  "pugixml": "https://github.com/zeux/pugixml",
  "pybind11": "https://github.com/pybind/pybind11",
  "qt": "https://github.com/qt/qtbase",
  "qt5": "https://github.com/qt/qtbase",
  "qt6": "https://github.com/qt/qtbase",
  "range-v3": "https://github.com/ericniebler/range-v3",
  "rapidjson": "https://github.com/Tencent/rapidjson",
  "re2": "https://github.com/google/re2",
  "sdl2": "https://github.com/libsdl-org/SDL",
  "simdjson": "https://github.com/simdjson/simdjson",
  "snappy": "https://github.com/google/snappy",
  "spdlog": "https://github.com/gabime/spdlog",
  "sqlite3": "https://github.com/sqlite/sqlite",
  "stb": "https://github.com/nothings/stb",
  "tinyxml2": "https://github.com/leethomason/tinyxml2",
  "tl-expected": "https://github.com/TartanLlama/expected",
  "trompeloeil": "https://github.com/rollbear/trompeloeil",
  "utf8cpp": "https://github.com/nemtrif/utfcpp",
  "utfcpp": "https://github.com/nemtrif/utfcpp",
  "vulkan": "https://github.com/KhronosGroup/Vulkan-Headers",
  "vulkan-headers": "https://github.com/KhronosGroup/Vulkan-Headers",
  "websocketpp": "https://github.com/zaphoyd/websocketpp",
  "wxwidgets": "https://github.com/wxWidgets/wxWidgets",
  "xxhash": "https://github.com/Cyan4973/xxHash",
  "yaml-cpp": "https://github.com/jbeder/yaml-cpp",
  "zlib": "https://github.com/madler/zlib",
  "zstd": "https://github.com/facebook/zstd",
};

function normalizePackageName(name: string): string {
  return name.trim().toLowerCase().replace(/[_-]/g, "");
}

function resolvePackageSource(packageName: string): string | null {
  const normalized = normalizePackageName(packageName);

  const exactMatch = KNOWN_PACKAGE_SOURCES[packageName];
  if (exactMatch) {
    return exactMatch;
  }

  const lowerMatch = KNOWN_PACKAGE_SOURCES[packageName.toLowerCase()];
  if (lowerMatch) {
    return lowerMatch;
  }

  for (const [key, value] of Object.entries(KNOWN_PACKAGE_SOURCES)) {
    if (normalizePackageName(key) === normalized) {
      return value;
    }
  }

  return null;
}

/**
 * Reads vcpkg.json and parses the dependencies array.
 * Maps each vcpkg dependency name to a known GitHub source URL.
 * Returns a list of ManifestDependency entries.
 */
export function importVcpkgDependencies(vcpkgPath: string): ManifestDependency[] {
  const content = fs.readFileSync(vcpkgPath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse ${vcpkgPath} as JSON.`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${vcpkgPath} must be a JSON object.`);
  }

  const manifest = parsed as Record<string, unknown>;

  if (!Array.isArray(manifest.dependencies)) {
    throw new Error(`${vcpkgPath} must define a "dependencies" array.`);
  }

  const dependencies: ManifestDependency[] = [];
  const missingSources: string[] = [];

  for (const entry of manifest.dependencies) {
    let name: string;

    if (typeof entry === "string") {
      name = entry.trim();
    } else if (typeof entry === "object" && entry !== null) {
      const obj = entry as Record<string, unknown>;
      name = typeof obj.name === "string" ? obj.name.trim() : "";
    } else {
      continue;
    }

    if (!name) {
      continue;
    }

    const source = resolvePackageSource(name);

    if (!source) {
      missingSources.push(name);
      continue;
    }

    dependencies.push({
      name,
      source,
    });
  }

  if (missingSources.length) {
    throw new Error(
      `Could not resolve GitHub sources for vcpkg packages: ${missingSources.join(", ")}. ` +
      `Add manual entries to cppkg.json for these packages.`,
    );
  }

  return dependencies;
}

/**
 * Reads conanfile.txt and parses the [requires] section.
 * Maps each conan package name to a GitHub source URL.
 * Returns a list of ManifestDependency entries.
 */
export function importConanDependencies(conanfilePath: string): ManifestDependency[] {
  const content = fs.readFileSync(conanfilePath, "utf8");
  const lines = content.split(/\r?\n/);
  let inRequires = false;
  const dependencies: ManifestDependency[] = [];
  const missingSources: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line.startsWith(";")) {
      if (line.startsWith("[") && line.endsWith("]")) {
        inRequires = line === "[requires]";
      }
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      inRequires = line === "[requires]";
      continue;
    }

    if (!inRequires) {
      continue;
    }

    const packageName = line.split("/")[0]!.trim();

    if (!packageName || packageName.includes("=") || seen.has(packageName)) {
      continue;
    }

    seen.add(packageName);

    const slashParts = line.split("/");
    let conanName = packageName;

    if (slashParts.length >= 2) {
      const rawSecond = slashParts[1]?.split("@")[0]?.trim();
      if (rawSecond) {
        conanName = rawSecond;
      }
    }

    const source = resolvePackageSource(conanName) || resolvePackageSource(packageName);

    if (!source) {
      missingSources.push(packageName);
      continue;
    }

    dependencies.push({
      name: packageName,
      source,
    });
  }

  if (missingSources.length) {
    throw new Error(
      `Could not resolve GitHub sources for conan packages: ${missingSources.join(", ")}. ` +
      `Add manual entries to cppkg.json for these packages.`,
    );
  }

  return dependencies;
}
