# cppkg-cli

<p align="center">
  <img src="./assets/icon.png" alt="cppkg-cli icon" width="128" height="128">
</p>

[Full guide](https://jeremyyu-cn.github.io/cppkg-cli/) | [Command reference](https://jeremyyu-cn.github.io/cppkg-cli/commands.html) | [中文](docs/README.zh-CN.md)

`cppkg-cli` downloads C/C++ dependencies into the current project. It keeps headers, source projects, cache files, lock data, and metadata under your workspace instead of installing libraries into system directories.

Use the hosted guide for the full workflow, install-mode details, CMake integration, configuration, and command pages:

- [English guide](https://jeremyyu-cn.github.io/cppkg-cli/)
- [Chinese guide](https://jeremyyu-cn.github.io/cppkg-cli/zh-CN.html)
- [Command reference](https://jeremyyu-cn.github.io/cppkg-cli/commands.html)

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

| Task | Command |
| --- | --- |
| Create a manifest | `cppkg-cli init` |
| Add and install a project dependency | `cppkg-cli add nlohmann/json --install` |
| Install all manifest dependencies | `cppkg-cli install` |
| Try a package without changing the manifest | `cppkg-cli get https://github.com/fmtlib/fmt` |
| Search for a package | `cppkg-cli search json` |
| Inspect missing includes | `cppkg-cli inspect` |
| Compile source files | `cppkg-cli compile src/main.cpp -o app` |
| Build a CMake project | `cppkg-cli build --release` |
| List installed packages | `cppkg-cli list` |
| Check project state | `cppkg-cli status` |

For command options, run:

```bash
cppkg-cli <command> --help
```

## Project Files

Typical cppkg files stay inside your project:

| Path | Purpose |
| --- | --- |
| `cppkg.json` | Project dependency manifest. |
| `cppkg-lock.json` | Resolved archive URLs and integrity data. |
| `cppkg.config.json` | Optional project config. |
| `cpp_libs/include/` | Shared include directory. |
| `cpp_libs/projects/` | Full source projects. |
| `cpp_libs/cache/` | Downloaded archive cache. |
