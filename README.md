# cppkg-cli

<p align="center">
  <img src="./assets/icon.png" alt="cppkg-cli icon" width="128" height="128">
</p>

[Full guide](https://jeremyyu-cn.github.io/cppkg-cli/) | [中文](docs/README.zh-CN.md)

`cppkg-cli` downloads C/C++ dependencies into the current project. It keeps headers, source projects, cache files, lock data, and metadata under your workspace instead of installing libraries into system directories.

Use the hosted guide for the full workflow, install-mode details, CMake integration, configuration, and command options:

- [English guide](https://jeremyyu-cn.github.io/cppkg-cli/)
- [Chinese guide](https://jeremyyu-cn.github.io/cppkg-cli/zh-CN.html)

## Quick Start

```bash
npm install -g cppkg-cli
cppkg-cli init
cppkg-cli add nlohmann/json --install
cppkg-cli compile src/main.cpp -o app
```

If `src/main.cpp` includes:

```cpp
#include <nlohmann/json.hpp>
```

then `cppkg-cli compile` automatically adds the default `./cpp_libs/include` path after installation.

## Quick Commands

### Package Management

| Task | Command |
| --- | --- |
| Create a manifest | `cppkg-cli init` |
| Add and install a dependency | `cppkg-cli add nlohmann/json --install` |
| Add without installing | `cppkg-cli add nlohmann/json` |
| Install all manifest dependencies | `cppkg-cli install` |
| Install with frozen lockfile | `cppkg-cli install --frozen-lockfile` |
| Preview changes (dry-run) | `cppkg-cli add fmtlib/fmt --dry-run` |
| Install offline from cache | `cppkg-cli install --offline` |
| Skip transitive dependencies | `cppkg-cli install --no-transitive` |
| Install workspace packages | `cppkg-cli install --workspace` |
| Try a package without manifest | `cppkg-cli get https://github.com/fmtlib/fmt` |
| Get a GitLab package | `cppkg-cli get https://gitlab.com/libname/lib` |
| Get a Bitbucket package | `cppkg-cli get https://bitbucket.org/owner/repo` |
| Install pre-built binaries | `cppkg-cli get owner/repo --binary linux/x64` |
| Remove a package | `cppkg-cli remove json` |
| Update packages | `cppkg-cli update` |
| Update to a specific tag | `cppkg-cli update fmt --tag 11.2.0` |
| Vendor dependencies locally | `cppkg-cli vendor` |
| Audit for vulnerabilities | `cppkg-cli audit` |

### Project Inspection & Discovery

| Task | Command |
| --- | --- |
| List installed packages | `cppkg-cli list` |
| List with dependency tree | `cppkg-cli list --tree` |
| Inspect source for missing includes | `cppkg-cli inspect` |
| Auto-add recommendations | `cppkg-cli inspect --add --install` |
| Search for a package | `cppkg-cli search json` |
| Show dependency chain | `cppkg-cli why fmt` |
| Check project health | `cppkg-cli status` |

### Scaffolding & Integration

| Task | Command |
| --- | --- |
| Scaffold a new C++ library | `cppkg-cli create my-lib` |
| Scaffold a header-only C library | `cppkg-cli create my-lib --header-only --c` |
| Integrate cppkg into CMake | `cppkg-cli integrate` |
| Generate cmake helper | `cppkg-cli cmake` |
| Import from vcpkg.json | `cppkg-cli import vcpkg.json` |
| Import from conanfile.txt | `cppkg-cli import conanfile.txt` |

### Build & Compile

| Task | Command |
| --- | --- |
| Compile source files | `cppkg-cli compile src/main.cpp -o app` |
| Build CMake project | `cppkg-cli build --release` |
| Manage compiler profiles | `cppkg-cli compiler list` |

### Server & Configuration

| Task | Command |
| --- | --- |
| Open the browser package manager | `cppkg-cli server` |
| Publish a release | `cppkg-cli publish --tag v1.0.0` |
| View config | `cppkg-cli config list` |
| Set config value | `cppkg-cli config set githubToken ghp_xxx` |
| Manage download cache | `cppkg-cli cache list` |

For command options, run:

```bash
cppkg-cli <command> --help
```

## Project Files

Typical cppkg files stay inside your project:

| Path | Purpose |
| --- | --- |
| `cppkg.json` | Project dependency manifest with platforms, hooks, binary settings. |
| `cppkg-lock.json` | Resolved archive URLs, integrity data, and transitive dependency graph. |
| `cppkg.config.json` | Optional project config (tokens, paths, proxy). |
| `cppkg-workspace.json` | Optional workspace config for monorepo setups. |
| `cppkg-toolchains.json` | Compiler profile definitions. |
| `cpp_libs/include/` | Shared include directory. |
| `cpp_libs/projects/` | Full source projects. |
| `cpp_libs/bin/` | Pre-built binaries (with `--binary`). |
| `cpp_libs/cache/` | Downloaded archive cache. |
| `vendor/` | Vendored dependencies (with `cppkg-cli vendor`). |
