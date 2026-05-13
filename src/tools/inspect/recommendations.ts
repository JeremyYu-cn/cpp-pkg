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
  // ---- abseil & protobuf ecosystem ----
  {
    matches: (includePath) =>
      matchesPrefix("absl")(includePath) || matchesPrefix("abseil")(includePath),
    name: "abseil",
    source: "https://github.com/abseil/abseil-cpp",
  },
  {
    matches: matchesPrefix("google/protobuf"),
    name: "protobuf",
    source: "https://github.com/protocolbuffers/protobuf",
  },
  {
    matches: (includePath) =>
      matchesPrefix("grpc")(includePath) || matchesPrefix("grpc++")(includePath) || matchesPrefix("grpcpp")(includePath),
    name: "grpc",
    source: "https://github.com/grpc/grpc",
  },
  {
    matches: (includePath) =>
      matchesPrefix("flatbuffers")(includePath) || matchesExact("flatbuffers.h")(includePath),
    name: "flatbuffers",
    source: "https://github.com/google/flatbuffers",
  },
  // ---- graphics / windowing ----
  {
    matches: matchesPrefix("SDL2"),
    name: "sdl2",
    source: "https://github.com/libsdl-org/SDL",
  },
  {
    matches: matchesPrefix("SDL"),
    name: "sdl2",
    source: "https://github.com/libsdl-org/SDL",
  },
  {
    matches: matchesPrefix("SFML"),
    name: "sfml",
    source: "https://github.com/SFML/SFML",
  },
  {
    matches: (includePath) =>
      matchesPrefix("GLFW")(includePath) || matchesExact("glfw3.h")(includePath),
    name: "glfw",
    source: "https://github.com/glfw/glfw",
  },
  {
    matches: (includePath) =>
      matchesPrefix("glad")(includePath) || matchesExact("glad.h")(includePath),
    name: "glad",
    source: "https://github.com/Dav1dde/glad",
  },
  {
    matches: (includePath) =>
      matchesPrefix("GL")(includePath) && includePath.includes("glew"),
    name: "glew",
    source: "https://github.com/nigels-com/glew",
  },
  // ---- 3d / game dev ----
  {
    matches: matchesPrefix("assimp"),
    name: "assimp",
    source: "https://github.com/assimp/assimp",
  },
  {
    matches: matchesPrefix("bullet"),
    name: "bullet",
    source: "https://github.com/bulletphysics/bullet3",
  },
  {
    matches: (includePath) =>
      matchesPrefix("stb")(includePath) || matchesExact("stb_image.h")(includePath),
    name: "stb",
    source: "https://github.com/nothings/stb",
  },
  {
    matches: matchesPrefix("tinyxml2"),
    name: "tinyxml2",
    source: "https://github.com/leethomason/tinyxml2",
  },
  {
    matches: matchesPrefix("pugixml"),
    name: "pugixml",
    source: "https://github.com/zeux/pugixml",
  },
  // ---- compression ----
  {
    matches: (includePath) =>
      matchesExact("zlib.h")(includePath) || matchesPrefix("zlib")(includePath),
    name: "zlib",
    source: "https://github.com/madler/zlib",
  },
  {
    matches: matchesExact("bzlib.h"),
    name: "bzip2",
    source: "https://gitlab.com/bzip2/bzip2",
  },
  {
    matches: matchesPrefix("lz4"),
    name: "lz4",
    source: "https://github.com/lz4/lz4",
  },
  {
    matches: matchesPrefix("zstd"),
    name: "zstd",
    source: "https://github.com/facebook/zstd",
  },
  {
    matches: matchesPrefix("snappy"),
    name: "snappy",
    source: "https://github.com/google/snappy",
  },
  // ---- image / media ----
  {
    matches: (includePath) =>
      matchesPrefix("png")(includePath) || matchesExact("png.h")(includePath),
    name: "libpng",
    source: "https://github.com/pnggroup/libpng",
  },
  {
    matches: (includePath) =>
      matchesPrefix("jpeglib")(includePath) || matchesExact("jpeglib.h")(includePath) || matchesExact("turbojpeg.h")(includePath),
    name: "libjpeg-turbo",
    source: "https://github.com/libjpeg-turbo/libjpeg-turbo",
  },
  {
    matches: matchesPrefix("tiff"),
    name: "libtiff",
    source: "https://gitlab.com/libtiff/libtiff",
  },
  {
    matches: matchesPrefix("gif"),
    name: "giflib",
    source: "https://github.com/mirrorer/giflib",
  },
  {
    matches: (includePath) =>
      matchesPrefix("freetype")(includePath) || matchesPrefix("ft2build")(includePath),
    name: "freetype",
    source: "https://github.com/freetype/freetype",
  },
  // ---- math / numerics ----
  {
    matches: (includePath) =>
      matchesPrefix("tbb")(includePath) || matchesPrefix("oneapi/tbb")(includePath),
    name: "tbb",
    source: "https://github.com/oneapi-src/oneTBB",
  },
  {
    matches: (includePath) =>
      matchesPrefix("Eigen")(includePath) || matchesPrefix("eigen3")(includePath) || matchesPrefix("unsupported/Eigen")(includePath),
    name: "eigen",
    source: "https://gitlab.com/libeigen/eigen",
  },
  {
    matches: matchesPrefix("ceres"),
    name: "ceres",
    source: "https://github.com/ceres-solver/ceres-solver",
  },
  {
    matches: (includePath) =>
      matchesPrefix("gsl")(includePath) && !includePath.toLowerCase().includes("gnu"),
    name: "gsl-lite",
    source: "https://github.com/gsl-lite/gsl-lite",
  },
  // ---- computer vision ----
  {
    matches: matchesPrefix("opencv2"),
    name: "opencv",
    source: "https://github.com/opencv/opencv",
  },
  {
    matches: matchesPrefix("OpenEXR"),
    name: "openexr",
    source: "https://github.com/AcademySoftwareFoundation/openexr",
  },
  {
    matches: (includePath) =>
      matchesPrefix("libavcodec")(includePath) || matchesPrefix("libavformat")(includePath) || matchesPrefix("libavutil")(includePath),
    name: "ffmpeg",
    source: "https://github.com/FFmpeg/FFmpeg",
  },
  // ---- embedded web servers ----
  {
    matches: matchesExact("mongoose.h"),
    name: "mongoose",
    source: "https://github.com/cesanta/mongoose",
  },
  {
    matches: matchesExact("civetweb.h"),
    name: "civetweb",
    source: "https://github.com/civetweb/civetweb",
  },
  {
    matches: matchesPrefix("microhttpd"),
    name: "libmicrohttpd",
    source: "https://github.com/Karlson2k/libmicrohttpd",
  },
  {
    matches: matchesPrefix("websocketpp"),
    name: "websocketpp",
    source: "https://github.com/zaphoyd/websocketpp",
  },
  // ---- rendering frameworks ----
  {
    matches: matchesPrefix("raylib"),
    name: "raylib",
    source: "https://github.com/raysan5/raylib",
  },
  {
    matches: matchesPrefix("bgfx"),
    name: "bgfx",
    source: "https://github.com/bkaradzic/bgfx",
  },
  {
    matches: matchesPrefix("nanogui"),
    name: "nanogui",
    source: "https://github.com/wjakob/nanogui",
  },
  {
    matches: matchesExact("nuklear.h"),
    name: "nuklear",
    source: "https://github.com/Immediate-Mode-UI/Nuklear",
  },
  // ---- scripting bindings ----
  {
    matches: (includePath) =>
      matchesPrefix("luajit")(includePath) || matchesExact("luajit.h")(includePath),
    name: "luajit",
    source: "https://github.com/LuaJIT/LuaJIT",
  },
  {
    matches: matchesPrefix("sol"),
    name: "sol2",
    source: "https://github.com/ThePhD/sol2",
  },
  {
    matches: matchesPrefix("pybind11"),
    name: "pybind11",
    source: "https://github.com/pybind/pybind11",
  },
  {
    matches: matchesPrefix("embind"),
    name: "embind",
    source: "https://github.com/emscripten-core/emscripten",
  },
  // ---- CLI / config ----
  {
    matches: matchesPrefix("cxxopts"),
    name: "cxxopts",
    source: "https://github.com/jarro2783/cxxopts",
  },
  {
    matches: matchesPrefix("argparse"),
    name: "argparse",
    source: "https://github.com/p-ranav/argparse",
  },
  {
    matches: matchesPrefix("toml++"),
    name: "tomlplusplus",
    source: "https://github.com/marzer/tomlplusplus",
  },
  {
    matches: matchesPrefix("nlohmann_fifo_map"),
    name: "nlohmann_fifo_map",
    source: "https://github.com/nlohmann/fifo_map",
  },
  // ---- math extensions ----
  {
    matches: matchesPrefix("gcem"),
    name: "gcem",
    source: "https://github.com/kthohr/gcem",
  },
  {
    matches: matchesPrefix("xtensor"),
    name: "xtensor",
    source: "https://github.com/xtensor-stack/xtensor",
  },
  {
    matches: matchesPrefix("armadillo"),
    name: "armadillo",
    source: "https://gitlab.com/conradsnicta/armadillo-code",
  },
  // ---- async I/O ----
  {
    matches: matchesPrefix("liburing"),
    name: "liburing",
    source: "https://github.com/axboe/liburing",
  },
  {
    matches: (includePath) =>
      matchesPrefix("event2")(includePath) || matchesPrefix("event.h")(includePath) && !includePath.includes("windows"),
    name: "libevent",
    source: "https://github.com/libevent/libevent",
  },
  {
    matches: matchesPrefix("uv"),
    name: "libuv",
    source: "https://github.com/libuv/libuv",
  },
  {
    matches: (includePath) =>
      matchesPrefix("asio")(includePath) && !includePath.toLowerCase().includes("boost"),
    name: "asio",
    source: "https://github.com/chriskohlhoff/asio",
  },
  // ---- JSON libraries ----
  {
    matches: (includePath) =>
      matchesPrefix("json")(includePath) && includePath.includes("jsoncpp"),
    name: "jsoncpp",
    source: "https://github.com/open-source-parsers/jsoncpp",
  },
  {
    matches: matchesPrefix("simdjson"),
    name: "simdjson",
    source: "https://github.com/simdjson/simdjson",
  },
  {
    matches: (includePath) =>
      matchesPrefix("rapidjson")(includePath) || matchesPrefix("rapid")(includePath) && includePath.includes("json"),
    name: "rapidjson",
    source: "https://github.com/Tencent/rapidjson",
  },
  // ---- crypto / security ----
  {
    matches: matchesPrefix("sodium"),
    name: "libsodium",
    source: "https://github.com/jedisct1/libsodium",
  },
  {
    matches: matchesPrefix("botan"),
    name: "botan",
    source: "https://github.com/randombit/botan",
  },
  {
    matches: matchesPrefix("mbedtls"),
    name: "mbedtls",
    source: "https://github.com/Mbed-TLS/mbedtls",
  },
  {
    matches: matchesPrefix("wolfssl"),
    name: "wolfssl",
    source: "https://github.com/wolfSSL/wolfssl",
  },
  // ---- databases ----
  {
    matches: matchesPrefix("leveldb"),
    name: "leveldb",
    source: "https://github.com/google/leveldb",
  },
  {
    matches: matchesPrefix("rocksdb"),
    name: "rocksdb",
    source: "https://github.com/facebook/rocksdb",
  },
  {
    matches: matchesExact("lmdb.h"),
    name: "lmdb",
    source: "https://github.com/LMDB/lmdb",
  },
  {
    matches: matchesPrefix("sqlite_orm"),
    name: "sqlite_orm",
    source: "https://github.com/fnc12/sqlite_orm",
  },
  {
    matches: matchesPrefix("SQLiteCpp"),
    name: "sqlitecpp",
    source: "https://github.com/SRombauts/SQLiteCpp",
  },
  // ---- web frameworks ----
  {
    matches: matchesPrefix("Poco"),
    name: "poco",
    source: "https://github.com/pocoproject/poco",
  },
  {
    matches: matchesPrefix("cpprest"),
    name: "cpprestsdk",
    source: "https://github.com/microsoft/cpprestsdk",
  },
  {
    matches: matchesPrefix("drogon"),
    name: "drogon",
    source: "https://github.com/drogonframework/drogon",
  },
  {
    matches: matchesPrefix("oatpp"),
    name: "oatpp",
    source: "https://github.com/oatpp/oatpp",
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
