# dsh-workflow-studio

> DeepSeek Harness 会话界面的可编排工作流 —— **Plan → Action → Review** 三阶段可视化画布。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.2-green)](#要求)

把 DSH 的会话界面从「线性对话」升级为**可拖拽连线的工作流画布**：Plan 阶段自动调研，Action 阶段自动或手动生成工作流，Review 阶段多维度审核闭环。核心差异化：**动态连线（每条边由 LLM 生成"要注入下游什么"）**、**多维度 Review 自动去重 + 动态 rubric**、**文件作为可连线资产**。

> 设计文档：`docs/BACKGROUND.md`（背景）· `docs/RESEARCH.md`（调研/选型）· `docs/DESIGN.md`（完整设计）。

## 功能

DSH Web 客户端 `conversation.view` 新增「工作流」标签（与 chat / trajectory 并列，不替换原生 UI）：

- **三阶段画布**：Plan → Action → Review，节点以精简钻石/图标 SVG + 文字呈现。
- **节点**：开始 / 调研 / 总结 / 计划 / 执行 / 审核；悬停展开下级，点击编辑。
- **动态连线**：连接两个节点即触发**边语义生成**，弹出候选（调研什么 / 总结什么…），确认后虚线上显示边标签，悬停显示完整意图。
- **三种 Action 模式**：普通（native）/ PTC（程序化工具调用）/ Loop（带审核条件边自循环）。
- **Review 审核**：多维度审核节点 + 意见去重 + 返工返回箭头。
- **Apple 级动效**：GSAP + CSS token 打底，spring 参数对齐 Apple HIG。

## 截图

> TODO：截图待里程碑合并后补。

## 要求

- DeepSeek Harness（web profile）
- Node.js ≥ 22.2

## 安装

```sh
# 从 npm 安装
dsh plugin --profile web add dsh-workflow-studio

# 从 GitHub 安装
dsh plugin --profile web add EaveBounty/dsh-workflow-studio

# 或从本地源码目录
dsh plugin --profile web add <path-to>/dsh-workflow-studio
```

重启 `dsh web`，会话页顶部出现「工作流」标签。

## 架构

- `lib/index.js` — cordis 宿主：`/api/dsh-workflow-studio/{workflow,edge-intent,review-dedupe}` 端点 + 会话投影。
- `lib/workflow.js` — 数据模型 + 纯逻辑（边语义候选、连接章程、Review 去重）。
- `lib/client.js` — React 客户端（`window.__ModuleLoader__`）：工作流画布 + 节点面板 + 动态连线；`@xyflow/react` 与 GSAP 以 UMD 注入。
- `cordis.patch.yml` — 注册到 bundle 的补丁。

> `lib/client.js` 为手写校验的 JSX bundle（无独立构建步骤）；`@xyflow/react` 与 GSAP 经 CDN UMD 注入，离线时功能降级。

## 贡献

欢迎 Issue / PR。请保持 zh/en 文案对等，并在 `README.md` 追加变更日志。

## 协议

[MIT](LICENSE)

## 变更日志

- 2026 规划：仓库初始化；三份设计文档；host/workflow/client 基座（M0/M1/M2 雏形）。
- 2026 规划：整合 M3 文件气泡、M4 Review 审核+去重+返工边、M5 GSAP 动效；修复函数序列化与 react-dom 注入。
- 2026 规划：新增运行时可视化（红箭头流 + 节点呼吸灯）、节点气泡（常显/悬浮模式 + 任务结果摘要 + 悬浮详情）、整体回退机制（逐节点快照历史 + 依赖级联重置）。
