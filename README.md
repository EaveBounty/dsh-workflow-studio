# dsh-workflow-studio

> DeepSeek Harness 会话界面的可编排工作流 —— **自由图模型**的可视化编排系统，让对话摆脱线性死板。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.2-green)](#要求)

把 DSH 的会话界面从「线性对话」升级为**可编排的自由图工作流**：**有且仅有一个启动节点**，其余为自由的图结构——可分支并行、可**从某节点返回到上一个节点再推进**（负反馈收敛），Loop 是**可含复杂内部图的循环体容器**。核心差异化：

- **对话生成流程**：在「工作流」标签内通过对话让 AI 从自然语言生成整张图（也可手工搭建，但不推荐）。
- **自由图 + 负反馈**：分支并行、反馈环收敛、Loop 循环体嵌套子图，不是"单程票"。
- **动态连线**：每条边由 AI 生成"要注入下游什么"；Review 落点语义自动猜测（拖到 Loop=评分闸门，否则=检查反馈）。
- **多对多 Review + 智能去重**：一个 Action 可接多个 Review，一个 Review 可接多个 Review（元审核）；接入多个 Review 时自动推测下一个不重复角度。
- **分支化输出**：每条分支可各自产出文件冒泡，不强制汇总成一个报告。
- **原生执行**：把图编译成 DSH 原生 workflow 脚本，节点真正派生子代理、分支并行执行（原生引擎缺失时自动回退仿真模式）。

> 设计文档：`docs/BACKGROUND.md`（背景）· `docs/RESEARCH.md`（调研/选型）· `docs/DESIGN.md`（完整设计）· `docs/AUDIT.md`（对抗性审计与修复追踪）。

## 功能

DSH Web 客户端 `conversation.view` 新增「工作流」标签（与 chat / trajectory 并列，不替换原生 UI）：

- **双栏工作流**：左「流程创建对话」/ 右「图画布」——输入需求让 AI 生成图，之后在画布增删改连。
- **自由图模型**：唯一启动节点 + 自由图结构；分支并行、负反馈环、Loop 循环体（可嵌套复杂图）。
- **节点/Agent**：根 / 计划 / 执行 / 审核 / 总结 / 维度 / 循环体；每个节点引用预设或**用户自定义 Agent**。
- **动态连线 + Review 落点语义**：连接即生成边语义；Review 拖到 Loop=评分闸门（够分放行否则循环），否则=该角度检查反馈。
- **多对多 Review + 智能去重**：接入多个 Review 自动推测下一个不重复角度（用尽后滚到元审核）。
- **三种 Action 模式**：普通（native）/ PTC（程序化工具调用）/ Loop（循环体）。
- **运行时可视化**：节点呼吸灯、活动边红箭头流动、任务结果气泡（常显/悬浮）、逐节点回退（快照 + 依赖级联重置）。
- **Apple 级动效**：GSAP + CSS token 打底，spring 参数对齐 Apple HIG；深色模式 / reduced-motion 适配。

## 截图

> TODO：截图待真机验收后补。

## 要求

- DeepSeek Harness（web profile）
- Node.js ≥ 22.2

## 安装

```sh
# 从 npm 安装（scoped，公司组织 @eave_bounty）
dsh plugin --profile web add @eave_bounty/dsh-workflow-studio

# 从 GitHub 安装
dsh plugin --profile web add EaveBounty/dsh-workflow-studio

# 或从本地源码目录
dsh plugin --profile web add <path-to>/dsh-workflow-studio
```

重启 `dsh web`，会话页顶部出现「工作流」标签。

### 启用原生执行（可选）

原生并行执行依赖 DSH 的 `workflowEngine`。插件已内置**自挂载**（`/run` 时 feature-detect，缺失则动态实例化 `@deepseek-ai/dsh-workflow-worker-thread`），通常无需额外配置。若你的 DSH 版本未内置该包，或希望显式启用，可在 profile `cordis.patch.yml` 追加：

```yaml
- id: workflow-worker-thread
  disabled: false
  config:
    provider: spawn
```

原生引擎不可用时，插件自动回退「仿真模式」（画布显示徽标），画布交互与结果回填仍可用。

## 架构

- `lib/index.js` — cordis 宿主：`/api/dsh-workflow-studio/{workflow,edge-intent,review-dedupe,review-landing,review-suggest,agents,run,generate}` 端点 + 会话投影 + 原生引擎自挂载。
- `lib/workflow.js` — 纯逻辑（边语义候选、连接章程、Review 去重、拓扑排序）。
- `lib/tree.js` — **自由图数据模型**（唯一启动节点、node kinds、预设/自定义 Agent、reviewLanding、suggestReview、parallelStages、graphDecompose/SCC、summarizeNodeTree）。
- `lib/compile.js` — **画布图 → DSH 原生 workflow 脚本编译器**（Promise.all 并行、反馈环 do-while 负反馈收敛、Loop 循环体嵌套子图、review schema、JSON.stringify 注入安全）。
- `lib/client.js` — React 客户端（`window.__ModuleLoader__`）：双栏对话生成 + 图画布 + 运行时可视化；`@xyflow/react` 与 GSAP 以 UMD 注入。
- `tests/` — `workflow.test.mjs`（58）+ `tree.test.mjs`（40）+ `execute.test.mjs`（11，用 node:vm 真实执行编译脚本）= **109 测试**。
- `cordis.patch.yml` — 注册到 bundle 的补丁。

> `lib/client.js` 为手写校验的 JSX bundle（无独立构建步骤）；`@xyflow/react` 与 GSAP 经 CDN UMD 注入，离线时功能降级。

## 测试

```sh
npm test        # 109 项（纯逻辑 + 图模型 + 真实执行）
npm run check   # 语法检查 + preflight 发布门禁
```

## 贡献

欢迎 Issue / PR。请保持 zh/en 文案对等，并在 `README.md` 追加变更日志。

## 协议

[MIT](LICENSE)

## 变更日志

- 2026 规划：仓库初始化；三份设计文档；host/workflow/client 基座（M0/M1/M2 雏形）。
- 2026 规划：整合 M3 文件气泡、M4 Review 审核+去重+返工边、M5 GSAP 动效；修复函数序列化与 react-dom 注入。
- 2026 规划：新增运行时可视化（红箭头流 + 节点呼吸灯）、节点气泡（常显/悬浮模式 + 任务结果摘要 + 悬浮详情）、整体回退机制（逐节点快照历史 + 依赖级联重置）。
- 2026 规划：新增 `workflow.js` 单元测试并接入 CI；新增插件设置页（气泡显示模式）；Action 三模式选择器；导出/导入。
- 2026 规划：按用户理念重构为**自由图模型 + 对话生成 + 原生并行执行 + 多对多 Review 智能去重 + Loop 循环体容器 + 分支化输出**；新增 `lib/tree.js`、`lib/compile.js`、`lib/execute.test.mjs`；新增 `/run`、`/generate`、`/review-suggest`、`/review-landing`、`/agents` 端点与原生引擎自挂载。
- 2026 规划：安全加固（C1 路径穿越 / readBody 413 / 错误脱敏 / 列表上限）、深色模式与无障碍修复、**109 项测试全绿 + preflight PASS**；创造模式冒泡运行 + node:vm 真实执行验证插件正确可运行。
- 2026-08-20 scoped 身份对齐：`cordis.patch.yml` 的 `name` 与 `lib/client.js` 的 `__ModuleLoader__.load` id 由 `dsh-workflow-studio` 改为规范名 `@eave_bounty/dsh-workflow-studio`（保留旧名别名注册兼容）；CSS tagId/data-plugin 同步；`scripts/preflight.mjs` 校验两个注册。修复 DSH profile 以 scoped 名安装时的 `Cannot find package 'dsh-workflow-studio'` 启动失败。
