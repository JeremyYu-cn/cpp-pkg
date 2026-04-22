# cppkg-cli

A CLI for downloading header-only C/C++ packages. The current version fetches a GitHub release archive, extracts the package `include/*` content, and merges it into a shared public directory at `./cpp_libs/include`.

[简体中文](./docs/README.zh-CN.md)

### Install

```bash
npm install -g cppkg-cli
```

For local development inside this repository:

```bash
npm install
npm run dev -- get https://github.com/nlohmann/json
```

### Usage

```bash
cppkg-cli get <github-repo-url>
cppkg-cli get --full-project <github-repo-url-or-api-url>
cppkg-cli list
cppkg-cli remove <package_name>
cppkg-cli update <package_name>
```

Examples:

Install a package:

```bash
cppkg-cli get https://github.com/nlohmann/json
cppkg-cli get https://github.com/fmtlib/fmt
```

Download and extract a full project:

```bash
cppkg-cli get --full-project https://api.github.com/repos/espruino/Espruino
cppkg-cli get --full-project https://github.com/espruino/Espruino
```

List installed packages:

```bash
cppkg-cli list
```

Update one installed package:

```bash
cppkg-cli update <package_name>
```

Update all installed packages:

```bash
cppkg-cli update
```

Remove one installed package:

```bash
cppkg-cli remove <package_name>
```

With a proxy:

```bash
cppkg-cli get https://github.com/nlohmann/json \
  --http-proxy http://127.0.0.1:7890 \
  --https-proxy http://127.0.0.1:7890
```

### Output Layout

After a successful install, headers are placed into the shared include directory under the current working directory, and package metadata is written to `./cpp_libs/deps.json`:

```text
your-project/
└── cpp_libs/
    ├── deps.json
    └── include/
        ├── nlohmann/
        │   └── json.hpp
        └── fmt/
            └── format.h
```

When `--full-project` is used, the whole repository source tree is extracted into `./cpp_libs/projects/<owner>_<repo>`:

```text
your-project/
└── cpp_libs/
    ├── deps.json
    ├── include/
    └── projects/
        └── espruino_Espruino/
            ├── src/
            ├── libs/
            ├── targets/
            └── README.md
```

Behavior:

- Only usable `include` directory content is kept from the downloaded archive.
- Package content under `include/xxx` is merged directly into `./cpp_libs/include`.
- Installed package metadata is recorded in `./cpp_libs/deps.json`, including version, install time, repository URL, archive URL, and tracked installed paths.
- `cppkg-cli get --full-project` downloads the repository source archive from the default branch and extracts it into `./cpp_libs/projects`.
- `cppkg-cli remove` deletes installed files based on the tracked metadata and keeps shared paths that are still referenced by other packages.
- `cppkg-cli update` refreshes one package or all packages by cleaning tracked files first and then reinstalling from the recorded GitHub source.
- In header-only mode, if a release does not provide a separate zip asset, the CLI falls back to the GitHub source `zipball`.

### Development

```bash
npm install
npm run dev -- --help
```

### Publish

This package is published as the `cppkg-cli` CLI command. Before publishing:

```bash
npm run build
npm pack --dry-run
npm publish
```

Published package contents:

- `dist`
- `README.md`
- `docs/README.zh-CN.md`
- `LICENSE`
