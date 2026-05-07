# cppkg-cli

<p align="center">
  <img src="./assets/icon.png" alt="cppkg-cli icon" width="128" height="128">
</p>

`cppkg-cli` downloads C/C++ packages from GitHub, Gitee, or remote zip archives into a project-local package directory. It can install reusable headers into a shared include tree, or fall back to full-project extraction when a package is not header-only.

[简体中文](./docs/README.zh-CN.md)

## Install

```bash
npm install -g cppkg-cli
```

For local development inside this repository:

```bash
npm install
npm run dev -- --help
```

## Quick Start

Create a project manifest:

```bash
cppkg-cli init
```

Add dependencies from the CLI:

```bash
cppkg-cli add nlohmann/json
cppkg-cli add https://github.com/fmtlib/fmt --tag 11.2.0
```

Or add dependencies to `cppkg.json` manually:

```json
{
  "dependencies": {
    "json": "https://github.com/nlohmann/json",
    "fmt": {
      "source": "https://github.com/fmtlib/fmt",
      "tag": "11.2.0"
    },
    "lvgl": {
      "source": "https://github.com/lvgl/lvgl",
      "branch": "master",
      "fullProject": true
    }
  }
}
```

Install everything in the manifest:

```bash
cppkg-cli install
```

Install only selected manifest entries:

```bash
cppkg-cli install json fmt
```

Require `cppkg-lock.json` to match the manifest before installing:

```bash
cppkg-cli install --frozen-lockfile
```

With the default config, installed files are written under `./cpp_libs`, and package metadata is written to `./cpp_libs/deps.json`.
Successful installs, updates, and removals also refresh `./cppkg-lock.json`, which records resolved archives and archive SHA-256 integrity data.

## Commands

| Command                           | Purpose                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| `cppkg-cli init`                  | Create `./cppkg.json`.                                                    |
| `cppkg-cli add <source>`          | Add one dependency to `cppkg.json`, optionally installing it.             |
| `cppkg-cli search <query...>`     | Search GitHub for C/C++ libraries sorted by stars.                        |
| `cppkg-cli inspect`               | Inspect C/C++ includes and report package needs.                          |
| `cppkg-cli compile <files...>`    | Compile simple source files with cppkg include paths.                     |
| `cppkg-cli build`                 | Configure and build a CMake project.                                      |
| `cppkg-cli compiler <subcommand>` | Manage compiler versions and Docker-backed compiler profiles.             |
| `cppkg-cli install [selector...]` | Install all manifest dependencies, or selected manifest entries.          |
| `cppkg-cli get <source-url...>`   | Install one or more package sources directly.                             |
| `cppkg-cli list`                  | List packages tracked in `deps.json`.                                     |
| `cppkg-cli status`                | Check manifest, lockfile, metadata, and installed files.                  |
| `cppkg-cli update [selector]`     | Update one tracked package, or all packages when no selector is provided. |
| `cppkg-cli remove <selector>`     | Remove one tracked package.                                               |
| `cppkg-cli cache <subcommand>`    | List or clean downloaded archive cache files.                             |
| `cppkg-cli cmake`                 | Generate a `cppkg.cmake` integration helper.                              |
| `cppkg-cli config <subcommand>`   | Manage project-level defaults in `./cppkg.config.json`.                   |

Run any command with `--help` for its current options.

## Manifest

Add entries without editing JSON by hand:

```bash
cppkg-cli add nlohmann/json
cppkg-cli add fmtlib/fmt --name fmt --tag 11.2.0
cppkg-cli add gitee.com/mirrors/jsoncpp --full-project
```

`cppkg.json` supports a name-to-source map:

```json
{
  "dependencies": {
    "json": "https://github.com/nlohmann/json",
    "fmt": {
      "source": "https://github.com/fmtlib/fmt",
      "tag": "11.2.0"
    }
  }
}
```

It also supports an array form:

```json
{
  "dependencies": [
    "https://github.com/nlohmann/json",
    {
      "name": "lvgl",
      "source": "https://github.com/lvgl/lvgl",
      "branch": "master",
      "fullProject": true
    }
  ]
}
```

Manifest object fields:

| Field         | Type               | Description                                                                                                              |
| ------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `source`      | string             | GitHub repo URL, GitHub API repo URL, Gitee repo URL, Gitee API repo URL, or remote zip URL.                             |
| `name`        | string             | Optional selector name for array entries. In map form, the map key is the dependency name.                               |
| `tag`         | string             | Install a specific release tag, or repository tag when no matching release exists.                                       |
| `branch`      | string             | Install a specific repository branch.                                                                                    |
| `versionRange` | string           | Install the highest release whose semantic version tag satisfies a range such as `^1.2.0` or `>=1.0.0 <2.0.0`.          |
| `versionPolicy` | string          | Version policy: `latest-release`, `latest-prerelease`, or `default-branch`.                                             |
| `prerelease`  | boolean            | Allow prerelease entries when resolving the latest release.                                                              |
| `fullProject` | boolean            | Skip include detection and install as a full project.                                                                    |
| `includePath` | string or string[] | Archive-relative include directory or directories to install. Direct zip URLs are installed as headers when this is set. |
| `stripPrefix` | string             | Archive-relative directory to treat as the source root after extraction.                                                 |
| `patches`     | string or string[] | Project-relative patch files applied with `git apply` after extraction.                                                  |
| `components`  | string or string[] | Top-level include or project entries to install from the selected root.                                                  |
| `checksum`    | string             | Expected archive SHA-256 digest. `sha256:<digest>` is also accepted.                                                     |

`tag`, `branch`, `versionRange`, and `versionPolicy` are mutually exclusive for the same dependency.

Example with install modifiers:

```json
{
  "dependencies": {
    "vendor-sdk": {
      "source": "https://example.com/downloads/vendor-sdk.zip",
      "checksum": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "stripPrefix": "sdk",
      "includePath": ["include", "single_include"],
      "components": ["vendor"],
      "patches": ["patches/vendor-sdk.patch"]
    }
  }
}
```

## Direct Install

Use `get` when you want to install a source without editing `cppkg.json`.

```bash
cppkg-cli get https://github.com/nlohmann/json
cppkg-cli get https://github.com/nlohmann/json https://github.com/fmtlib/fmt
```

Supported source formats:

```bash
cppkg-cli get https://github.com/nlohmann/json
cppkg-cli get https://api.github.com/repos/nlohmann/json
cppkg-cli get https://gitee.com/mirrors/jsoncpp.git
cppkg-cli get https://gitee.com/api/v5/repos/mirrors/jsoncpp
cppkg-cli get https://example.com/downloads/my-sdk.zip
```

Version and install-mode options:

```bash
cppkg-cli get https://github.com/nlohmann/json --tag v3.12.0
cppkg-cli get https://github.com/lvgl/lvgl --branch master
cppkg-cli get https://github.com/owner/repo --version-range '^1.2.0'
cppkg-cli get https://github.com/owner/repo --version-policy default-branch
cppkg-cli get https://github.com/owner/repo --prerelease
cppkg-cli get https://github.com/lvgl/lvgl --full-project
cppkg-cli get https://github.com/nlohmann/json --no-cache
cppkg-cli get https://example.com/vendor.zip --include-path include
cppkg-cli get https://example.com/vendor.zip --strip-prefix sdk --components vendor
cppkg-cli get https://example.com/vendor.zip --checksum sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

## Search Packages

Use `search` when you know what kind of library you need but do not know the exact repository URL.

```bash
cppkg-cli search json
cppkg-cli search http client --limit 20
cppkg-cli search gui --language C++
```

Results are queried from GitHub and sorted by star count. By default the command searches `language:C++` repositories and excludes forks and archived repositories.

In an interactive terminal, `search` opens a selector after printing results.
Use Up/Down to move, Enter to install, and `q` or Esc to cancel.

Use `--select` for non-interactive selection by result index:

```bash
cppkg-cli search json --select 1
```

Use `--no-interactive` when you only want to print results:

```bash
cppkg-cli search json --no-interactive
```

Search install options:

```bash
cppkg-cli search lvgl --full-project
cppkg-cli search fmt --no-cache
```

Set `GITHUB_TOKEN` or `GH_TOKEN` in your environment when you need higher GitHub API rate limits.
You can also persist project-level GitHub and Gitee tokens with `cppkg-cli config set githubToken ...` and `cppkg-cli config set giteeToken ...`.

## Inspect Includes

Scan the current project for C/C++ includes and compare detected package candidates with `cppkg.json` and installed metadata:

```bash
cppkg-cli inspect
cppkg-cli inspect --add
cppkg-cli inspect --install
```

Known include patterns such as `fmt/*` and `nlohmann/*` are mapped to installable package sources when possible. `--add` writes recommended missing candidates to `cppkg.json`; `--install` also installs them.

## Compile And Build

For small projects without CMake, compile source files with the configured cppkg include directory:

```bash
cppkg-cli compile src/main.cpp -o app
cppkg-cli compile src/main.cpp src/app.cpp --compiler clang++ --std c++23 -o build/app
```

For CMake projects, `build` configures and builds in `./build` by default. It creates `cppkg.cmake` when missing and injects it during CMake configure so the shared include directory is available:

```bash
cppkg-cli build
cppkg-cli build --release
cppkg-cli build --target app --build-dir cmake-build
```

Use `--dry-run` to inspect the compiler or CMake commands without executing them:

```bash
cppkg-cli compile src/main.cpp --dry-run
cppkg-cli build --release --dry-run
```

Run the same commands inside Docker to unify compiler and CMake versions across machines:

```bash
cppkg-cli compile src/main.cpp -o app --docker --docker-image gcc:latest
cppkg-cli build --docker --docker-image cppkg-build:latest
```

`--docker` mounts the current project at `/workspace` and runs the compiler command there. The default Docker image is `gcc:latest`, which is enough for `compile`; `build` needs an image that also provides `cmake`.

Compiler versions can be managed as profiles in `cppkg-toolchains.json`:

```bash
cppkg-cli compiler list
cppkg-cli compiler install gcc-13 --dry-run
cppkg-cli compiler install gcc-13 --set-default
cppkg-cli compiler add project-clang --kind clang --compiler-version 18 --docker-image cppkg-clang:18 --set-default
cppkg-cli compiler current
```

Use a saved profile explicitly, or let `compile` and `build` use the default profile:

```bash
cppkg-cli compile src/main.cpp --toolchain gcc-13 -o app
cppkg-cli build --toolchain project-clang
```

Built-in Docker profiles include `gcc-13`, `gcc-14`, `gcc-latest`, `clang-17`, `clang-18`, and `clang-latest`. GCC profiles use official `gcc:<version>` images. Clang profiles default to `silkeh/clang:<version>`; override with `--docker-image` when your team has a preferred image.

## Manage Packages

List installed packages:

```bash
cppkg-cli list
```

Check project consistency:

```bash
cppkg-cli status
cppkg-cli doctor
```

Update all packages, or one package:

```bash
cppkg-cli update
cppkg-cli update json
cppkg-cli update json --tag v3.12.0
cppkg-cli update lvgl --branch master
cppkg-cli update lvgl --full-project
```

Remove one package:

```bash
cppkg-cli remove json
```

Manage downloaded archive cache files:

```bash
cppkg-cli cache list
cppkg-cli cache clean
cppkg-cli cache clean --older-than 30
```

Selectors accepted by `install`, `update`, and `remove`:

| Selector                                           | Example                                                 |
| -------------------------------------------------- | ------------------------------------------------------- |
| Manifest dependency name or installed package name | `json`                                                  |
| Repository path                                    | `/nlohmann/json`                                        |
| Owner/repository                                   | `nlohmann/json`                                         |
| Provider host shorthand                            | `github.com/nlohmann/json`, `gitee.com/mirrors/jsoncpp` |
| Recorded source URL                                | `https://github.com/nlohmann/json`                      |

`install` selectors are matched against entries in `cppkg.json`. `update` and `remove` selectors are matched against installed records in `deps.json`.

## CMake

Generate a helper that exposes the shared include directory as `cppkg::headers` and adds full-project installs that contain `CMakeLists.txt`:

```bash
cppkg-cli cmake
```

Then include it from your project:

```cmake
include("${CMAKE_CURRENT_LIST_DIR}/cppkg.cmake")
target_link_libraries(my_target PRIVATE cppkg::headers)
```

## Config

Project-level config is stored in `./cppkg.config.json`.

```bash
cppkg-cli config set proxy http://127.0.0.1:7890
cppkg-cli config set githubToken ghp_xxx
cppkg-cli config set giteeToken xxxxxx
cppkg-cli config set packageRootDir third_party/cppkg
cppkg-cli config set includeDirName include
cppkg-cli config set projectsDirName projects
cppkg-cli config set cacheDirName cache
cppkg-cli config get packageRootDir
cppkg-cli config list
cppkg-cli config remove proxy
```

Supported config keys:

| Key               | Default     | Description                                                                                     |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `proxy`           | empty       | Default proxy for HTTP and HTTPS requests.                                                      |
| `httpProxy`       | empty       | Default HTTP proxy.                                                                             |
| `httpsProxy`      | empty       | Default HTTPS proxy.                                                                            |
| `githubToken`     | empty       | GitHub token for private repositories, release assets, source archives, and search rate limits. |
| `giteeToken`      | empty       | Gitee token for private repositories, releases, and source archives.                            |
| `packageRootDir`  | `cpp_libs`  | Root directory for installed package data.                                                      |
| `includeDirName`  | `include`   | Shared include directory under `packageRootDir`.                                                |
| `projectsDirName` | `projects`  | Full-project directory under `packageRootDir`.                                                  |
| `cacheDirName`    | `cache`     | Downloaded archive cache directory under `packageRootDir`.                                      |
| `depsFileName`    | `deps.json` | Installed package metadata file under `packageRootDir`.                                         |

CLI proxy flags override config values. Add `--no-cache` to `get`, `install`, or `update` when you need to bypass cached archives and refresh downloads.

```bash
cppkg-cli get https://github.com/nlohmann/json \
  --http-proxy http://127.0.0.1:7890 \
  --https-proxy http://127.0.0.1:7890
```

## Output Layout

Default layout:

```text
your-project/
├── cppkg.json
├── cppkg.cmake
├── cppkg-lock.json
├── cppkg-toolchains.json
└── cpp_libs/
    ├── deps.json
    ├── cache/
    ├── include/
    │   ├── nlohmann/
    │   │   └── json.hpp
    │   └── fmt/
    │       └── format.h
    └── projects/
        ├── espruino_Espruino/
        └── mirrors_jsoncpp/
```

Install behavior:

- Repository sources are checked for published releases through the GitHub or Gitee API.
- Version ranges select the highest matching semantic-version release tag; `default-branch` skips release lookup and installs the repository default branch archive.
- Downloaded archives are cached under the configured cache directory and reused by matching archive URL.
- If `checksum` is set, the downloaded archive SHA-256 must match before extraction.
- `stripPrefix` changes the extracted source root before patches, include detection, and project copying.
- `patches` are applied with `git apply` after extraction and prefix stripping.
- `includePath` overrides automatic include detection and can make direct zip URLs install as headers.
- `components` limits copying to selected top-level entries under the include directory or project root.
- If a release archive exposes a usable `include` directory, headers are merged into the configured include directory.
- If the release archive does not expose a usable `include` directory, the CLI retries with the repository archive.
- If no usable include directory is found, the package is installed as a full project under the configured projects directory.
- Repositories without releases and direct remote zip URLs are installed as full projects.
- Direct archive URLs are installed into a sanitized directory name derived from the source URL.
- Metadata records the package version, install time, repository URL, archive URL, archive SHA-256 integrity, requested source selection, install mode, and tracked top-level paths.
- `cppkg-lock.json` records the resolved dependency set used for frozen manifest installs.
- `remove` deletes tracked paths while preserving paths still referenced by other installed packages.
- `update` cleans tracked paths first, then reinstalls from the recorded source URL. It reuses the recorded install mode and recorded tag or branch unless new options are provided.
- If a release does not provide a separate zip asset, the CLI falls back to the provider source archive, such as a GitHub `zipball`.
