# Contributing to dsh-workflow-studio

感谢你愿意为本项目贡献！请遵循以下约定，让协作顺畅。

## 开发约定

- **语言**：代码/注释用英文；面向用户的文案保持 **zh / en 对等**（`lib/client.js` 的 `zh` / `en` 字典）。
- **客户端是手写 bundle**：`lib/client.js` 无独立构建步骤，用 `React.createElement` 风格（`jsx`/`jsxs`/`Fragment`），**不要**引入 JSX / TS / import。外部库以 UMD 全局注入（`window.ReactFlow` / `window.gsap`）。
- **纯逻辑放 host**：可复用、可测试的纯函数放 `lib/workflow.js`（不依赖 DSH 服务）；DSH 接线（webServer / 会话投影 / RPC）放 `lib/index.js`。

## 提交流程

1. `npm run check`（`node --check` + preflight）必须通过。
2. 遵守 Conventional Commits（`feat:` / `fix:` / `docs:` / `refactor:` / `chore:` …）。
3. 每个实质性改动在 `README.md` 末尾**追加一行变更日志**（日期 + 改动摘要）。
4. 新增/修改 UI 时保持 Apple 级动效与 `--ws-*` token 规范（见 `docs/DESIGN.md §9`），并遵守 `prefers-reduced-motion` 降级。

## Issue / PR

- Bug：提供 DSH 版本、Node 版本、复现步骤、期望 vs 实际行为。
- 功能：说明动机、用法、对现有模块的影响。
- PR：请在描述中关联相关 Issue，并说明改动与测试。

再次感谢你的贡献！
