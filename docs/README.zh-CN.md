# cppkg-cli

[English](../README.md)

这是一个面向头文件库的 C/C++ 包下载 CLI。当前版本会从 GitHub release 拉取压缩包，自动提取包里的 `include/*`，并统一归并到当前项目下的公共目录 `./cpp_libs/include`。

### 安装

```bash
npm install -g cppkg-cli
```

在仓库里本地调试：

```bash
npm install
npm run dev -- get https://github.com/nlohmann/json
```

### 使用

```bash
cppkg-cli get <github-repo-url>
cppkg-cli get --full-project <github-repo-url-or-api-url>
cppkg-cli list
cppkg-cli remove <package>
cppkg-cli update [package]
```

示例：

安装一个包：

```bash
cppkg-cli get https://github.com/nlohmann/json
cppkg-cli get https://github.com/fmtlib/fmt
```

下载并解压整个项目：

```bash
cppkg-cli get --full-project https://api.github.com/repos/espruino/Espruino
cppkg-cli get --full-project https://github.com/espruino/Espruino
```

查看已安装包：

```bash
cppkg-cli list
```

更新单个包：

```bash
cppkg-cli update json
```

更新全部已安装包：

```bash
cppkg-cli update
```

删除一个包：

```bash
cppkg-cli remove json
```

如果需要代理：

```bash
cppkg-cli get https://github.com/nlohmann/json \
  --http-proxy http://127.0.0.1:7890 \
  --https-proxy http://127.0.0.1:7890
```

### 输出结构

执行成功后，头文件会被放到当前目录下的公共 `include` 目录，同时安装元数据会写入 `./cpp_libs/deps.json`：

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

当使用 `--full-project` 时，整个仓库源码会被解压到 `./cpp_libs/projects/<owner>_<repo>`：

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

处理规则：

- 只保留压缩包里可用的 `include` 目录内容。
- 会把 `include/xxx` 下的内容直接归并到 `./cpp_libs/include`。
- 已安装包的信息会记录到 `./cpp_libs/deps.json`，包括版本、安装时间、仓库 URL、归档 URL 和实际落盘路径。
- `cppkg-cli get --full-project` 会下载仓库默认分支的源码归档，并解压到 `./cpp_libs/projects`。
- `cppkg-cli remove` 会根据记录的元数据删除当前包的文件，并尽量保留仍被其他包引用的共享路径。
- `cppkg-cli update` 会先清理当前包的已记录文件，再按记录下来的 GitHub 来源重新安装指定包或全部包。
- 在头文件模式下，如果 release 没有单独的 zip 资源，会退回到 GitHub 源码 `zipball`。

### 开发

```bash
npm install
npm run build
node dist/main.js --help
```

### 发布

这个包会以 CLI 命令 `cppkg-cli` 发布，发布前建议先检查：

```bash
npm run build
npm pack --dry-run
npm publish
```

发布包中只会包含：

- `dist`
- `README.md`
- `docs/README.zh-CN.md`
- `LICENSE`
