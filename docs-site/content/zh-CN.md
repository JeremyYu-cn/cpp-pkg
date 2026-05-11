# cppkg-cli

<p align="center">
  <img src="./assets/icon.png" alt="cppkg-cli icon" width="128" height="128">
</p>

[English](./index.html)

`cppkg-cli` 是一个项目本地的 C/C++ 依赖下载工具。它不会把库安装到系统目录，而是把依赖放在当前项目下，方便提交配置、复现安装结果和清理依赖。

安装结果分两类：

| 依赖类型 | 默认位置 | 典型例子 |
| --- | --- | --- |
| 可直接 include 的头文件 | `cpp_libs/include/` | `nlohmann/json`、`fmt` |
| 需要完整源码树的项目 | `cpp_libs/projects/` | GUI 库、SDK、带 CMakeLists 的源码包 |

具体命令参数以 `cppkg-cli <command> --help` 为准。

## 安装

```bash
npm install -g cppkg-cli
```

## 最快验证

```bash
cppkg-cli init
cppkg-cli add nlohmann/json --install
cppkg-cli compile src/main.cpp -o app
```

这组命令适合新项目快速试一下 cppkg：

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 1 | `cppkg-cli init` | 创建 `cppkg.json`。 |
| 2 | `cppkg-cli add nlohmann/json --install` | 写入依赖并安装头文件。 |
| 3 | `cppkg-cli compile src/main.cpp -o app` | 使用 `cpp_libs/include` 编译源码。 |

如果你的源码里有：

```cpp
#include <nlohmann/json.hpp>
```

安装成功后，`cppkg-cli compile` 会自动把默认的 `./cpp_libs/include` 加入 include 路径。

## 先选命令

大多数情况下，先按场景选命令：

| 你要做什么 | 用哪个命令 | 会不会改 `cppkg.json` |
| --- | --- | --- |
| 只临时试用一个包 | `cppkg-cli get <url>` | 不会 |
| 查看已安装包 | `cppkg-cli list` | 不会 |
| 给项目新增一个长期依赖 | `cppkg-cli add <source> --install` | 会 |
| 安装 `cppkg.json` 里的全部依赖 | `cppkg-cli install` | 不会 |
| 不知道仓库地址，先搜索 | `cppkg-cli search <keywords>` | 不会 |
| 在浏览器里管理包 | `cppkg-cli server` | 可选 |
| 编译单个或少量源码文件 | `cppkg-cli compile <files...>` | 不会 |

项目依赖推荐走 `add` + `install`。`get` 更适合临时下载和验证，不适合作为团队项目的长期依赖入口。

## 浏览器 Web Server

需要在网页里浏览包、编辑配置、查看安装日志时，启动本地包管理页面：

```bash
cppkg-cli server
```

默认绑定到 `127.0.0.1:4936`，启动后会打印可打开的 URL。需要换端口或监听地址时：

```bash
cppkg-cli server --port 0
cppkg-cli server --host 0.0.0.0 --port 4936
```

Web UI 包含这些页签：

| 页签 | 作用 |
| --- | --- |
| Installed packages | 从 `cpp_libs/deps.json` 查看已安装包元数据。 |
| Search and download | 搜索 GitHub 仓库，并把下载或写入 manifest 后安装加入任务队列。 |
| Direct download | 支持仓库 URL、`owner/repo`、Gitee URL 和 zip URL。粘贴 GitHub/Gitee release 或 branch 地址时，会自动填写包名以及 `tag` 或 `branch`。 |
| Manifest | 查看 `cppkg.json` 里的依赖和 manifest 解析错误。 |
| Status | 检查 manifest、锁文件、已安装元数据和已跟踪文件，展示项目健康问题。 |
| Config | 读取和写入 `cppkg.config.json`；token 会在浏览器里脱敏显示。 |
| Tasks | 查看排队、运行中和已完成任务的实时日志，并可取消还在排队的任务。 |

下载和 manifest 操作都会作为后台任务执行，所以页面可以持续显示解析、下载、解压和记录元数据的进度。

开发这个仓库里的 Web UI 时，使用 Vite 版本：

```bash
npm run server:web:dev
```

这个脚本会同时启动 cppkg API server 和 Vite UI。如果默认 API 端口被占用，它会自动选择另一个本地端口，并把 Vite 的 `/api` 代理指到该端口。

## 文件放在哪里

默认情况下，cppkg 只写入当前项目目录：

| 路径 | 用途 |
| --- | --- |
| `cppkg.json` | 项目的依赖声明文件。 |
| `cppkg-lock.json` | 解析后的归档 URL 和 SHA-256 完整性信息。 |
| `cppkg.config.json` | 可选的项目级配置，例如代理、token、安装目录。 |
| `cppkg-toolchains.json` | 可选的编译器 profile 配置。 |
| `cppkg.cmake` | 由 `cppkg-cli cmake` 生成的 CMake 集成文件。 |
| `cpp_libs/include/` | 可复用头文件的共享 include 目录。 |
| `cpp_libs/projects/` | 需要完整源码树的包。 |
| `cpp_libs/cache/` | 下载归档缓存。 |
| `cpp_libs/deps.json` | 已安装包元数据，供 `list`、`status`、`update`、`remove` 使用。 |

典型结构如下：

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
        ├── lvgl_lvgl/
        └── mirrors_jsoncpp/
```

## 常用工作流

### 用 manifest 管理依赖

适用场景：这个依赖属于项目本身，其他开发者或 CI 也需要安装。

```bash
cppkg-cli init
cppkg-cli add nlohmann/json --install
```

常见变体：

```bash
cppkg-cli add fmtlib/fmt --name fmt --tag 11.2.0 --install
cppkg-cli add gitee.com/mirrors/jsoncpp --full-project --install
```

结果：

- 依赖会写进 `cppkg.json`。
- 安装结果会记录到 `cpp_libs/deps.json`。
- 解析后的归档和完整性信息会写进 `cppkg-lock.json`。

后续在另一台机器或 CI 上安装全部依赖：

```bash
cppkg-cli install
```

只安装其中几个依赖：

```bash
cppkg-cli install json fmt
```

要求锁文件和 manifest 完全匹配：

```bash
cppkg-cli install --frozen-lockfile
```

### 临时安装一个来源

适用场景：只是验证一个包能不能用，不想把它写进项目依赖声明。

```bash
cppkg-cli get https://github.com/nlohmann/json
```

一次安装多个来源：

```bash
cppkg-cli get https://github.com/nlohmann/json https://github.com/fmtlib/fmt
```

直接安装 zip，并指定它里面的 include 目录：

```bash
cppkg-cli get https://example.com/vendor.zip --include-path include
```

结果：`get` 会安装并记录到 `cpp_libs/deps.json`，但不会修改 `cppkg.json`。如果这个依赖后来要长期保留，改用 `add <source> --install`。

`get` 支持这些来源：

| 来源 | 示例 |
| --- | --- |
| GitHub 仓库 | `https://github.com/nlohmann/json` |
| GitHub API 仓库 | `https://api.github.com/repos/nlohmann/json` |
| Gitee 仓库 | `https://gitee.com/mirrors/jsoncpp.git` |
| Gitee API 仓库 | `https://gitee.com/api/v5/repos/mirrors/jsoncpp` |
| 远程 zip | `https://example.com/downloads/my-sdk.zip` |

常用安装选项：

| 需求 | 选项示例 |
| --- | --- |
| 固定 release tag | `--tag v3.12.0` |
| 使用指定分支 | `--branch master` |
| 使用语义化版本范围 | `--version-range '^1.2.0'` |
| 直接使用默认分支 | `--version-policy default-branch` |
| 安装 prerelease | `--prerelease` |
| 强制完整项目安装 | `--full-project` |
| 跳过缓存重新下载 | `--no-cache` |
| 指定 zip 内 include 目录 | `--include-path include` |
| 指定 zip 内源码根目录 | `--strip-prefix sdk` |
| 只复制顶层条目 | `--components vendor` |
| 校验下载归档 | `--checksum sha256:<digest>` |

### 搜索并安装

适用场景：知道要找哪类库，但还不知道准确仓库地址。

```bash
cppkg-cli search json
cppkg-cli search http client --limit 20
cppkg-cli search gui --language C++
```

默认会搜索 `language:C++`，排除 fork 和已归档仓库，并按 star 数排序。

交互式终端里，搜索结果下面会出现选择器：

| 按键 | 作用 |
| --- | --- |
| 上下键 | 移动选择 |
| Enter | 安装当前选中的仓库 |
| `q` 或 Esc | 取消 |

脚本或 CI 中，按结果序号安装：

```bash
cppkg-cli search json --select 1
```

只打印搜索结果、不进入选择器：

```bash
cppkg-cli search json --no-interactive
```

结果：`search` 选中后会直接安装，行为接近 `get`，不会写入 `cppkg.json`。

### 从 include 反推依赖

适用场景：项目源码已经写了 `#include <...>`，但你不确定还缺哪些依赖。

```bash
cppkg-cli inspect
cppkg-cli inspect --add
cppkg-cli inspect --install
```

| 命令 | 作用 |
| --- | --- |
| `cppkg-cli inspect` | 只检查缺失依赖。 |
| `cppkg-cli inspect --add` | 把推荐依赖写入 `cppkg.json`。 |
| `cppkg-cli inspect --install` | 写入 manifest 后继续安装。 |

常见 include 模式，例如 `fmt/*` 和 `nlohmann/*`，会尽量映射到可安装的包来源。

## 编译和构建

先按项目类型选择命令：

| 项目类型 | 推荐命令 | 说明 |
| --- | --- | --- |
| 单文件或少量源码文件 | `cppkg-cli compile <files...>` | 直接调用编译器，并自动加入 cppkg include 路径。 |
| CMake 项目 | `cppkg-cli build` | 自动处理 CMake configure/build 流程。 |
| 想先看实际命令 | `--dry-run` | 只打印命令，不真正编译或构建。 |
| 需要统一编译环境 | `--docker` 或 `--toolchain` | 使用 Docker 镜像或保存的编译器 profile。 |

### 直接编译源码文件

小项目没有 CMake 时，用 `compile`。它会把当前配置的 cppkg include 目录加入编译参数：

```bash
cppkg-cli compile src/main.cpp -o app
cppkg-cli compile src/main.cpp src/app.cpp --compiler clang++ --std c++23 -o build/app
```

常用选项：

| 需求 | 示例 |
| --- | --- |
| 指定输出文件 | `-o app` |
| 指定编译器 | `--compiler clang++` |
| 指定 C++ 标准 | `--std c++23` |
| 使用 toolchain profile | `--toolchain gcc-14` |
| 在 Docker 中编译 | `--docker --docker-image gcc:latest` |

### 构建 CMake 项目

CMake 项目用 `build`。默认构建目录是 `./build`：

```bash
cppkg-cli build
cppkg-cli build --release
cppkg-cli build --target app --build-dir cmake-build
```

如果缺少 `cppkg.cmake`，`build` 会自动生成，并在 CMake configure 阶段注入 cppkg include 目录。

常用选项：

| 需求 | 示例 |
| --- | --- |
| Release 构建 | `--release` |
| 指定 target | `--target app` |
| 指定构建目录 | `--build-dir cmake-build` |
| 使用 toolchain profile | `--toolchain project-clang` |
| 在 Docker 中构建 | `--docker --docker-image cppkg-build:latest` |

### Dry Run

```bash
cppkg-cli compile src/main.cpp --dry-run
cppkg-cli build --release --dry-run
```

`--dry-run` 适合检查最终会执行的编译器或 CMake 命令，不会写入构建产物。

### Docker 编译环境

```bash
cppkg-cli compile src/main.cpp -o app --docker --docker-image gcc:latest
cppkg-cli build --docker --docker-image cppkg-build:latest
```

`compile` 的默认 Docker 镜像是 `gcc:latest`。`build` 需要镜像里已经安装 `cmake`。

### 编译器 profile

编译器 profile 保存在 `cppkg-toolchains.json`。内置 Docker profile 包括 `gcc-13`、`gcc-14`、`gcc-latest`、`clang-17`、`clang-18` 和 `clang-latest`。

```bash
cppkg-cli compiler list
cppkg-cli compiler install clang-18 --set-default
cppkg-cli compiler current
cppkg-cli compiler use gcc-14
```

创建项目自己的 profile：

```bash
cppkg-cli compiler add project-clang \
  --kind clang \
  --compiler-version 18 \
  --docker-image cppkg-clang:18 \
  --set-default
```

显式选择 profile，或使用默认 profile：

```bash
cppkg-cli compile src/main.cpp --toolchain gcc-14 -o app
cppkg-cli build --toolchain project-clang
```

## 日常维护

查看已安装包：

```bash
cppkg-cli list
```

检查 manifest、锁文件、元数据和已安装文件是否一致：

```bash
cppkg-cli status
cppkg-cli doctor
```

更新全部包或某个包：

```bash
cppkg-cli update
cppkg-cli update json
cppkg-cli update json --tag v3.12.0
cppkg-cli update lvgl --branch master
cppkg-cli update lvgl --full-project
```

删除一个包：

```bash
cppkg-cli remove json
```

管理下载归档缓存：

```bash
cppkg-cli cache list
cppkg-cli cache clean
cppkg-cli cache clean --older-than 30
```

`install`、`update` 和 `remove` 支持这些 selector：

| Selector | 示例 |
| --- | --- |
| Manifest 依赖名或已安装包名 | `json` |
| 仓库路径 | `/nlohmann/json` |
| `owner/repo` | `nlohmann/json` |
| 平台 host 简写 | `github.com/nlohmann/json`、`gitee.com/mirrors/jsoncpp` |
| 已记录的来源 URL | `https://github.com/nlohmann/json` |

`install` 的 selector 匹配 `cppkg.json` 条目。`update` 和 `remove` 的 selector 匹配 `deps.json` 中的已安装记录。

## cppkg.json 写法

`cppkg.json` 是项目依赖声明文件。优先用 `add` 生成，少手写：

```bash
cppkg-cli add nlohmann/json
cppkg-cli add fmtlib/fmt --name fmt --tag 11.2.0
cppkg-cli add gitee.com/mirrors/jsoncpp --full-project
```

最常见的三种写法：

| 需求 | 写法 |
| --- | --- |
| 只声明来源 | `"json": "https://github.com/nlohmann/json"` |
| 固定版本 | `"fmt": { "source": "...", "tag": "11.2.0" }` |
| 强制完整项目安装 | `"lvgl": { "source": "...", "branch": "master", "fullProject": true }` |

推荐使用对象映射。映射 key 就是依赖名，也是后续 `install`、`update`、`remove` 常用的 selector：

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

也支持数组写法。数组条目建议显式写 `name`，否则后续用 selector 时不够直观：

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

注意：命令行 `add` 可以写 `owner/repo`、`github.com/owner/repo` 或 `gitee.com/owner/repo`。手写 `cppkg.json` 时，`source` 必须是完整的 `http` 或 `https` URL。

### 来源和版本字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `source` | string | GitHub 仓库 URL、GitHub API 仓库 URL、Gitee 仓库 URL、Gitee API 仓库 URL，或远程 zip URL。 |
| `name` | string | 数组条目的可选 selector 名称。对象映射写法中，映射 key 就是依赖名。 |
| `tag` | string | 安装指定 release tag；如果没有匹配 release，则安装同名仓库 tag 归档。 |
| `branch` | string | 安装指定仓库分支。 |
| `versionRange` | string | 安装满足语义化版本范围的最高 release tag，例如 `^1.2.0`、`~1.2.0`、`1.x` 或 `>=1.0.0 <2.0.0`。 |
| `versionPolicy` | string | 版本策略：`latest-release`、`latest-prerelease` 或 `default-branch`。 |
| `prerelease` | boolean | 解析 latest release 或版本范围时允许选择 prerelease。 |

同一个依赖只能选择一种版本来源：`tag`、`branch`、`versionRange`、`versionPolicy` 不能同时使用。

### 安装修饰字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `fullProject` | boolean | 跳过 include 探测，直接安装为完整项目。 |
| `includePath` | string 或 string[] | 指定归档内的 include 目录。远程 zip 只有设置它时才会按头文件安装。 |
| `stripPrefix` | string | 解压后，把归档内某个相对目录当作源码根目录。 |
| `patches` | string 或 string[] | 解压并处理 `stripPrefix` 后，用 `git apply` 应用项目内 patch 文件。 |
| `components` | string 或 string[] | 只安装 include 目录或项目根目录下的指定顶层条目。 |
| `checksum` | string | 期望的归档 SHA-256 摘要，支持纯摘要或 `sha256:<digest>`。 |

带安装修饰字段的完整示例：

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

## 安装模式怎么判断

这部分决定依赖最终进入 `cpp_libs/include` 还是 `cpp_libs/projects`。

### 默认规则

| 输入来源 | 默认行为 | 结果 |
| --- | --- | --- |
| GitHub/Gitee 仓库，有 release | 先检查 release 归档里是否有可用 include 目录 | 有则进 `include`，否则回退到 `projects` |
| GitHub/Gitee 仓库，无 release | 使用仓库源码归档 | 通常进 `projects` |
| 指定 `--branch` | 跳过 release，使用分支源码归档 | 按源码归档探测或安装 |
| 指定 `--full-project` | 跳过 include 探测 | 直接进 `projects` |
| 远程 zip | 不走 GitHub/Gitee release 逻辑 | 默认进 `projects` |
| 远程 zip + `--include-path` | 使用指定目录作为 include 根 | 进 `include` |

### 选项处理顺序

| 阶段 | 相关字段 |
| --- | --- |
| 1. 下载归档 | `tag`、`branch`、`versionRange`、`versionPolicy`、`prerelease` |
| 2. 校验归档 | `checksum` |
| 3. 调整源码根目录 | `stripPrefix` |
| 4. 应用补丁 | `patches` |
| 5. 选择 include 或完整项目 | `fullProject`、`includePath` |
| 6. 限制复制范围 | `components` |
| 7. 写入锁文件和元数据 | `cppkg-lock.json`、`cpp_libs/deps.json` |

### 更新和删除

| 命令 | 行为 |
| --- | --- |
| `cppkg-cli update` | 先清理旧记录路径，再按记录来源重新安装。没有传新选项时，会沿用上次安装模式和版本选择。 |
| `cppkg-cli remove` | 删除 `deps.json` 里记录的安装路径。共享路径仍被其他包引用时会保留。 |
| `cppkg-cli install --frozen-lockfile` | 要求 `cppkg-lock.json` 和 `cppkg.json` 匹配，然后按锁文件安装。 |

下载归档会缓存在配置的缓存目录里。需要重新下载时，给 `get`、`install` 或 `update` 加 `--no-cache`。

## CMake 集成

生成 `cppkg.cmake`：

```bash
cppkg-cli cmake
```

在项目的 `CMakeLists.txt` 里引入：

```cmake
include("${CMAKE_CURRENT_LIST_DIR}/cppkg.cmake")
target_link_libraries(my_target PRIVATE cppkg::headers)
```

`cppkg::headers` 会暴露共享 include 目录。`cppkg.cmake` 也会自动添加包含 `CMakeLists.txt` 的完整项目安装。

## 项目级配置

配置保存在 `./cppkg.config.json`：

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

支持的配置项：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `proxy` | 空 | HTTP 和 HTTPS 请求的默认代理。 |
| `httpProxy` | 空 | 默认 HTTP 代理。 |
| `httpsProxy` | 空 | 默认 HTTPS 代理。 |
| `githubToken` | 空 | 用于 GitHub 私有仓库、release asset、源码归档和搜索限流的 token。 |
| `giteeToken` | 空 | 用于 Gitee 私有仓库、release 和源码归档的 token。 |
| `packageRootDir` | `cpp_libs` | 安装数据根目录。 |
| `includeDirName` | `include` | `packageRootDir` 下的共享 include 目录名。 |
| `projectsDirName` | `projects` | `packageRootDir` 下的完整项目目录名。 |
| `cacheDirName` | `cache` | `packageRootDir` 下的下载归档缓存目录名。 |
| `depsFileName` | `deps.json` | `packageRootDir` 下的已安装包元数据文件名。 |

GitHub token 也可以通过 `GITHUB_TOKEN` 或 `GH_TOKEN` 提供；Gitee token 也可以通过 `GITEE_TOKEN` 提供。项目级配置优先于这些环境变量。

CLI 代理参数优先于配置文件：

```bash
cppkg-cli get https://github.com/nlohmann/json \
  --http-proxy http://127.0.0.1:7890 \
  --https-proxy http://127.0.0.1:7890
```
