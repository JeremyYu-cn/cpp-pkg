# TODO: Potential New Features

## High Priority

- [x] **`cppkg graph`** — 依赖图可视化，输出 DOT/Mermaid 格式或 ASCII 树，方便查看依赖关系
- [x] **`cppkg verify`** — 校验所有已安装包的 checksum 与锁文件是否一致，确保文件完整性
- [x] **`cppkg env`** — 系统环境诊断，显示编译器版本、CMake、OS、Node 等信息，帮助排查问题

## Medium Priority

- [x] **`cppkg licenses`** — 扫描所有已安装包的开源许可证，生成第三方许可报告（类似 npm licenses）
- [x] **`cppkg diff`** — 对比锁文件差异，显示版本变更
- [x] **`cppkg cache export/import`** — 导出/导入缓存，便于 CI 流水线加速
- [x] **`cppkg self-update`** — 检查并自动更新 CLI 工具本身（检查 npm 最新版本）

## Low Priority

- [x] **`cppkg migrate`** — 从 Conan/vcpkg 迁移到 cppkg（已支持 import，可扩展为双向迁移）

## Code Quality

- [x] 引入 ESLint/Prettier 统一代码风格
- [x] 添加代码覆盖率报告（vitest 配置）
- [x] 拆分 `src/tools/download/sources.ts`（791 行）为独立 provider 文件
