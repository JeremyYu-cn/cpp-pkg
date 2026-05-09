# cppkg-cli

<p align="center">
  <img src="../assets/icon.png" alt="cppkg-cli icon" width="128" height="128">
</p>

[完整使用指南](https://jeremyyu-cn.github.io/cppkg-cli/zh-CN.html) | [English](../README.md)

`cppkg-cli` 是一个项目本地的 C/C++ 依赖下载工具。它把头文件、完整源码项目、缓存、锁文件和元数据都放在当前项目里，不会安装到系统目录。

完整工作流、安装模式、CMake 集成、项目配置和命令参数，请看已经部署的文档页：

- [中文使用指南](https://jeremyyu-cn.github.io/cppkg-cli/zh-CN.html)
- [英文使用指南](https://jeremyyu-cn.github.io/cppkg-cli/)

## 快速开始

```bash
npm install -g cppkg-cli
cppkg-cli init
cppkg-cli add nlohmann/json --install
cppkg-cli compile src/main.cpp -o app
```

如果 `src/main.cpp` 里有：

```cpp
#include <nlohmann/json.hpp>
```

安装成功后，`cppkg-cli compile` 会自动把默认的 `./cpp_libs/include` 加入 include 路径。

## 常用快速命令

| 任务 | 命令 |
| --- | --- |
| 临时试用一个包，不修改 manifest | `cppkg-cli get https://github.com/fmtlib/fmt` |
| 查看已安装包 | `cppkg-cli list` |
| 添加并安装项目依赖 | `cppkg-cli add nlohmann/json --install` |
| 安装 manifest 里的全部依赖 | `cppkg-cli install` |
| 创建 manifest | `cppkg-cli init` |
| 搜索包 | `cppkg-cli search json` |
| 打开浏览器包管理页面 | `cppkg-cli server` |
| 编译源码文件 | `cppkg-cli compile src/main.cpp -o app` |

查看命令参数：

```bash
cppkg-cli <command> --help
```

## 项目文件

典型 cppkg 文件都会留在项目目录内：

| 路径 | 用途 |
| --- | --- |
| `cppkg.json` | 项目依赖声明文件。 |
| `cppkg-lock.json` | 解析后的归档 URL 和完整性信息。 |
| `cppkg.config.json` | 可选项目配置。 |
| `cpp_libs/include/` | 共享 include 目录。 |
| `cpp_libs/projects/` | 完整源码项目。 |
| `cpp_libs/cache/` | 下载归档缓存。 |
