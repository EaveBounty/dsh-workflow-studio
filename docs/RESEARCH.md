# 深度调研报告：避免重复造轮子 + 技术选型依据

> 配套文件：`BACKGROUND.md`（背景介绍）。本文件汇总四项联网深度调研（子代理），并给出技术选型建议。
> 状态：**4/4 已完成**。

---

## 一、核心结论（TL;DR）

1. **「边携带语义并注入下游」目前没有任何主流框架实现** —— 这是本项目最大的差异化空白点。
   现成最近邻：Airflow **XCom**（边显式传数据）、n8n **连线映射表达式**、Dify 变量赋值器、LangGraph **共享 State + reducer**。
2. **Review 作为图节点** 是 LangGraph 原生玩法（generator + critic 双节点 + 条件边循环），学术界即 **Self-Refine / Reflexion**。
3. **Claude 的 loop** = Claude Code 的 **agent loop**（官方架构）+ `/loop` `/goal` `/schedule` 命令。
4. **DSH 的 PTC = Programmatic Tool Call（程序化工具调用）**，**不是** plan-task-check。
   已在本机一手核实：`config/agent-presets/code/preset.yml` → `name: PTC 模式`，`agent.cordis.yml` → `tool-presentation mode: code`。
   效果：模型写一段 TypeScript 把多步工具调用串成一次执行，省大量往返与 tokens。
5. **多维度审核先例齐备**：MT-Bench / Prometheus / G-Eval / **AdaRubric（动态 rubric = 自动调整 prompt）**、LangGraph interrupt（人审闸门）、AutoGen human_input_mode、n8n 审批节点。
6. **评审意见自动去重** 几乎无现成实现 —— 第二个空白点。
7. **DSH 插件生态尚无「单插件顶级样板仓」** —— 早期红利窗口，本项目可做成第一个教科书级范例。

---

## 二、节点图 / 工作流编辑器库选型（子代理 6567f609，✅ 已完成）

**核心决策：用 `@xyflow/react`（React Flow v12）官方 UMD 单文件注入做基座。**

- **@xyflow/react 12.11**：**MIT**；38,054★；min 187KB / gzip 60KB；官方自带 UMD `dist/umd/index.js`（暴露 `window.ReactFlow`，外部化 `react/jsx-runtime`/`react`/`react-dom`，与 DSH React 客户端同源、无双 React 实例问题）。功能全覆盖：自定义节点、**多连接点 `<Handle>`**（子步骤连接点）、**边语义标签 `EdgeLabelRenderer`**（可交互点击）、Bezier/SmoothStep/Straight 边 + 箭头、拖入建节点、`onNodeMouseEnter`/`onNodeClick`、MiniMap/Controls/Background、`toObject()` 导出、parentId 子流程嵌套、snapToGrid。n8n/Langflow/Flowise 均建于此库之上（Langflow 源码直接 import `@xyflow/react`）。
- **tldraw**：49,861★，但 **2024-11 起自定义"tldraw license"，生产环境必须商业授权/密钥** → 一票否决。
- **Rete.js**：MIT 12k★，无 UMD，交互打磨不足 → 不选；借鉴其"数据模型/执行引擎与渲染解耦"分层思想。
- **draw.io (diagrams.net) / maxGraph**：Apache-2.0；整站 webapp + iframe 隔离，XML 模型错位 → 仅未来导出 .drawio 兼容、参考其布局算法。
- **reagraph / react-force-graph**：可视化专用非编辑器 → 排除。
- **Svelte Flow / svelte-flow**：与 React 客户端异源 → 排除。
- **Obsidian Canvas**：闭源，仅借鉴交互手感；**采用其开放 JSON Canvas 规范做工作流序列化格式**（`jsoncanvas.org`）。

**落地路径（开发期 0 构建、运行时注入一个文件）**：插件 `apply()` 时把 harness 注入的 React 挂到全局（`window.React`/`window.ReactDOM`/`window.jsxRuntime`）→ 把官方 UMD `dist/umd/index.js`（183KB）内嵌为静态字符串或注入 `<script>` → `window.ReactFlow` 全量 API 可用。成本：1–2 天接入，+60KB gzip，比自研省 2–4 周。

**兜底自研架构**（仅当"零第三方运行时依赖"硬约束）：**DOM 节点层 + SVG 边层 + transform 视口**（与 React Flow 内部架构同构，未来可无损迁移）。节点=<div> 绝对定位真实 HTML；边层=`pointer-events:none` 的 SVG（贝塞尔/直角 + marker 箭头 + 边标签）；视口=单容器 `transform: translate+scale`。300–500 节点内性能无忧。**不用纯 canvas**（丢 HTML 交互）、**不纯 SVG 画节点**（文本/HTML 混排差）、**不纯 DOM 画边**（曲线成本高）。

### 数据速查表
| 库 | Stars | 许可 | min/gzip | UMD | DSH 可用性 |
|---|---|---|---|---|---|
| **@xyflow/react 12.11.3** | 38,054 | MIT ✅ | 187KB/60KB | ✅ | ★★★★★ 基座 |
| tldraw | 49,861 | 自定义(生产禁) ❌ | 1.76MB/524KB | ❌ | ✖ 许可否决 |
| rete 2.0.6 | 12,221 | MIT ✅ | 19KB/5.4KB | ❌ | ★★ 借鉴架构 |
| drawio / maxGraph | 7.6k/— | Apache-2.0 ✅ | 整站 webapp / 4.8MB | iframe | ★ 导出/布局 |
| reagraph / react-force-graph | 1.1k/3.3k | Apache/MIT | 1.4MB/2.3MB | 部分 | ✖ 可视化专用 |
| @xyflow/svelte | 同仓 | MIT ✅ | — | ❌(需Svelte) | ✖ 异源 |
| Obsidian Canvas | 闭源 | 专有 ❌ | — | — | 交互/JSON Canvas 格式参考 |

**来源**：[bundlephobia @xyflow/react](https://bundlephobia.com/package/@xyflow/react@12.11.2)、[@xyflow/react UMD](https://cdn.jsdelivr.net/npm/@xyflow/react@12.11.3/dist/umd/index.js)、[xyflow 仓库](https://github.com/xyflow/xyflow)、[React Flow 文档](https://reactflow.dev)、[tldraw 许可证](https://github.com/tldraw/tldraw/blob/main/LICENSE.md)、[Rete.js](https://github.com/retejs/rete)、[drawio embed](https://www.drawio.com/docs/reference/embed-mode/)、[maxGraph](https://github.com/maxgraph/maxgraph)、[Langflow 前端](https://github.com/langflow-ai/langflow)、[Flowise agentflow UMD](https://www.jsdelivr.com/package/npm/@flowiseai/agentflow)、[JSON Canvas](https://jsoncanvas.org)。

---

## 三、AI 工作流编排范式（子代理 9c590b90，✅ 已完成）

### 3.1 框架对照

| 框架 | 能力 | 节点/边建模 | 边携带语义？ | 多维度审核？ | 可借鉴 |
|---|---|---|---|---|---|
| **LangGraph** | 低层 Agent 图框架 | `add_node/add_edge/add_conditional_edges` + 共享 State + **reducer**（合并同 key 多写）+ `Send` 并行 + `interrupt()` HITL | 无 LLM 边语义；边仅路由 | 审核节点=普通节点（generator+critic 官方模式） | **reducer = 多线注入合并的现成答案**；interrupt = 审核闸门范本 |
| **AutoGen / Agent Framework** | 会话式多代理 | 边=发言权转移；`human_input_mode`（NEVER/TERMINATE/ALWAYS） | 无 | 内建人审门 | 终止条件判定 ≈ Review 节点职责 |
| **Semantic Kernel** | 企业级 Agent SDK；Processes | Step + Function + 显式 State + 事件 emit/onEvent 当"边" | 无；事件即边、数据经 State | 无内建 | 事件驱动边可对照"边注入" |
| **Prefect** | Python 工作流引擎 | 边=task 依赖；**Artifacts** 产物挂节点供下游 | 无 LLM 语义；数据经 return/artifacts | 无内建 | **Artifacts ≈ 文件作为可连线资产** |
| **Airflow** | 经典 DAG 调度器 | 边=依赖；**XCom** 跨任务键值传数据（TaskFlow 自动传参） | 显式 XCom payload，无 LLM 语义 | 无 | **XCom = 边上注入什么的最直接类比** |
| **n8n** | 可视化自动化+AI Agent | 节点+连线，数据 JSON items 沿边流动，边可配**映射表达式** | 无 LLM 生成；边上表达式=最接近的手动版 | 审批/Send-and-Wait 节点 | 边上字段映射、subgraph 可研究 |
| **Langflow / Flowise** | 可视化 RAG/Agent 图构建器 | 节点=组件，边=数据流，靠**端口类型**约束连接 | 无 | 无 | 端口类型约束可约束边生成范围 |
| **CrewAI** | 角色化多代理 | Crews + **Flows**（`@start/@router/@listen` 事件驱动、条件路由） | 无 | manager agent 兼审核 | `@listen` 事件驱动+持久化；manager ≈ Review |
| **MetaGPT** | 多代理软件公司 SOP | 角色即节点，**文档（PRD/设计/代码）作为节点间工件** | 无；工件=边数据 | QA/code review 角色 | 文档作为工件传递 ≈ 文件资产挂节点 |
| **Claude Agent SDK** | Anthropic 官方 Agent 运行时 | 单 agent loop（非图）；subagents 树状委托 | 无图无边 | 无内建 | loop 控制（permission 模式）执行/审核分离 |

### 3.2 范式与理论基础

- **ReAct**（Yao 2022）：Thought→Action→Observation，所有框架默认循环。
- **Plan-and-Solve**（Wang 2023）：先计划再执行 → 对应 **Plan 阶段**。
- **Self-Refine / Reflexion**：生成→自反馈→再生成（记忆化反思）→ 对应 **Review 闭环**。
- **Tree of Thoughts**（Yao 2023）：树状搜索 + LLM 评估打分剪枝。
- **LLM-as-judge**（MT-Bench，Zheng 2023）：单一 judge 多维度打分。

### 3.3 DSH 与 PTC（一手核实，本机确认 ✅）

- DSH = DeepSeek 官方 2026-08 开源的**全栈插件化 Agent 执行底座**（对标 Claude Code / Codex），理念"一切皆插件"，基于 Cordis。仓库：`deepseek-ai/deepseek-harness`。
- **Agent preset 机制**：一个 preset = `preset.yml`（名称/描述）+ `agent.cordis.yml`（Cordis 组合，挂单 agent scope）。自定义预设放 `~/.dsh/.agent-presets/<id>/`。
- **内置四预设**（本机核实）：
  - `standard` 标准模式：功能完整，默认。
  - `code` **PTC 模式**：**Programmatic Tool Call**，`tool-presentation mode: code`（vs native）。实测同任务比标准省 ~7 分钟、输入 tokens 从 520万→150万。
  - `minimal` 极简模式：仅 2 工具，官方跑分用。
  - `cordis` 创造模式：标准 + 动态 Cordis 插件工具，可创作新 preset。
- **对应设计**：DSH 已具备 Plan（plan-mode）→ Action（tool-goal 循环 / tool-ralph / subagents / workflow worker）→ Review（thesis-self-review 人机审批闸门 / academic-paper-reviewer 多视角评审）的完整底座。**三种 Action 模式可分别对标**：普通 = native；PTC = code；Loop = 带审核条件边的自循环。

### 3.4 多维度 Review / 审核门

| 机制 | 做法 | 可借鉴 |
|---|---|---|
| MT-Bench | 单一 judge 多轮多维度打分 | 多维度=一个 judge prompt 内含评分表 |
| Prometheus / G-Eval | 按自定义 rubric 打分（开源 judge 模型） | 评审维度可配置 |
| **AdaRubric** | **任务自适应动态生成/精炼 rubric** | 正是"自动调整 prompt" |
| 多 judge / A-B | 并行多个 judge 打分投票 | **维度节点 = 每维度一个 judge，天然并行** |
| **HITL 人审闸门** | LangGraph `interrupt()` / AutoGen `human_input_mode` / n8n 审批 | Review 节点"自动通过/转人工"两档 |
| 发布/部署门 | LLM judge + 置信区间作 CI gate | "评审通过才进下游"产品化 |
| 评审意见去重 | **几乎无现成实现** | **空白点：聚类去重+合并为唯一整改清单** |

### 3.5 落地建议（编排侧）

1. **边建模**为带负载对象 `{ from, to, intent(LLM生成), payloadSchema, injectInto }`；执行引擎二选一：LangGraph 式共享 State（命名通道+reducer 合并）或 Airflow 式边负载（XCom 化）；**LLM 生成 intent 先转 JSON Schema 校验再注入**，防漂移。
2. **Review 节点** = generator + critic 双节点 + 条件边（PASS / REWORK）；维度节点=并行 judge 子节点；rubric 用 AdaRubric 式动态生成；HITL 兜底。
3. **文件资产** = 仿 Prefect Artifacts / MetaGPT 工件，文件显式挂节点、边可引用。
4. **三种 Action 模式**：普通=native；PTC=code 批量；Loop=带审核条件边自循环。
5. **快速原型**：做成 DSH 插件/预设，复用其 approval 栈与 Cordis 隔离机制。

---

## 四、顶级 GitHub 插件仓库排版（子代理 8c14b2f8，✅ 已完成）

### 4.1 Top 插件仓库（star 已尽量核实）

home-assistant/core(≈89.3k)、uBlock Origin(≈65.3k)、refined-github(≈31.4k)、darkreader(≈22.2k)、lazy.nvim(≈21.2k)、GitLens(≈9.9k)。
共性：**徽章 + 演示 GIF + 快速开始 + 配置表 + FAQ + 贡献 + 许可** 的 README；分层目录；GitHub Actions 全自动测试与发布；社区治理文件齐全。

### 4.2 2026 专业仓库标准要素

- README 七段式；**LICENSE 首选 MIT（DSH 官方同款）**，企业级可选 Apache-2.0（专利条款）。
- **semantic-release + conventional commits + keep-a-changelog**。
- **npm OIDC Trusted Publishing**（2025-07 GA，发布零 token）。
- OpenSSF Scorecard / CodeQL / Dependabot。
- docsify / VitePress / TypeDoc / Storybook。

### 4.3 DSH 生态

官方 `deepseek-ai/deepseek-harness`（第三方报道 ≈11 万 star，MIT，Cordis 架构，docs/architecture + cordis-primer + cordis-tutorial + examples，中英双语 README）。
社区已有 `awesome-dsh-plugin`、`Ephemeral-AI-Lab/dsh-plugins`、npm 上 `dsh-thread` / `dsh-tui-plugin` 等。
**结论：尚无「单插件顶级样板」，早期红利窗口。**

### 4.4 可套用的 Node.js DSH 插件仓库结构（模板）

```
<repo>/
├─ package.json            # dsh.bundle.patch + dsh.client.platform:"web"
├─ cordis.patch.yml        # 注册 host 插件 + web client 的 bundle 补丁
├─ LICENSE                 # MIT
├─ README.md               # 中英双语，七段式
├─ .gitignore
├─ .github/
│  ├─ workflows/ci.yml     # 测试 + lint + preflight
│  ├─ workflows/release.yml# semantic-release + OIDC publish + GitHub Release
│  ├─ ISSUE_TEMPLATE/
│  ├─ PULL_REQUEST_TEMPLATE.md
│  ├─ CODE_OF_CONDUCT.md
│  └─ FUNDING.yml
├─ lib/                    # index.js(host) / stats.js / client.js(手写 bundle)
├─ scripts/preflight.mjs   # 发布门禁
├─ docs/
├─ assets/                 # 截图 / GIF
└─ tests/
```

### 4.5 发布检查清单

`npm pack --dry-run` 校验 → 打 `dsh-plugin` topic → OIDC provenance → 提交 awesome 列表 PR → GitHub Releases。

---

## 五、Apple 级动画与设计系统（子代理 4f9a0653，✅ 已完成）

**核心决策：CSS token + 原生 transition 打底 → 自写 60 行 Apple 弹簧（mass1 / stiffness 170–200 / damping 20–26）→ GSAP 3（UMD 注入，23kb）负责拖拽磁吸与 FLIP → View Transitions 做视图级转场。全程无构建。**

- **引擎分工**：微交互=原生 CSS transition + spring 近似曲线（零依赖）；弹簧物理=自写 rAF 插值 / CSS `linear()`；重型（拖拽磁吸/FLIP/序列）= **GSAP 3**（唯一"官方 UMD + 全套插件 Draggable/Flip/MotionPathPlugin/ScrollTrigger"，23kb）；页面/面板级转场= **CSS View Transitions API**（同文档，Baseline Newly available；跨文档 Firefox 不支持需降级）。**不选** Framer Motion / react-spring（均无 UMD，仅留 importmap 未来路径）。
- **Spring 统一参数**：默认 `mass 1 / stiffness 170–200 / damping 20–26`（克制、几乎不弹）；**Apple 强调弹簧 = `1 / 157.9 / 17.6`**（= SwiftUI `Spring(duration:0.5, bounce:0.3)` 官方换算）；Snappy `1/300/30`；Bouncy `1/100/10`。
- **时长分层**：instant 100ms（按下/触觉）· fast 150ms（hover/磁吸）· base 250ms（默认转场=Core Animation 默认值）· slow 400ms（面板/抽屉）· expressive 550ms（shared element）。
- **Easing**：`--ease-out: cubic-bezier(0.16,1,0.3,1)`（Apple 式快启慢停）· `--ease-in-out: cubic-bezier(0.45,0,0.25,1)` · `--ease-overshoot: cubic-bezier(0.34,1.56,0.64,1)`（轻微回弹）。⚠️ Material 的 `(0.2,0,0,1)` 不是 Apple 规范，勿照搬。
- **玻璃拟态（Liquid Glass）**：`backdrop-filter: blur(20px) saturate(180%)` + 半透明白底 + 1px 半透明白描边 + `inset 0 1px 0` 顶部高光；⚠️ 大面积 + 动画时 blur 有 WebKit 性能 bug → 玻璃面尽量静态小面积；必须提供"降低透明度"降级。
- **圆角**：主按钮 ≈12px，卡片 12–16px，大面板 20–24px，图标 squircle 近似 `border-radius:22.37%`。
- **配色 ⚠️ 2025 刷新**：经典系统蓝 `#007AFF`，但 **WWDC25 (iOS 26) 后 HIG 已调整为 `#0088FF`**；落地前以 [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color/) 核对，两个值都标注。
- **图形编辑器动效**：节点拖拽只动 `transform`（rAF 直写，禁弹簧跟手，松手用 120–180ms 短弹簧吸附）；连接点磁吸阈值 10–14px（React Flow Proximity Connect / GSAP Draggable snap）；边激活用 `stroke-dashoffset` 流动虚线、新建边用 `pathLength` 0→1 生长、粒子沿边用 GSAP MotionPathPlugin；**画布批量重排=逐节点位置弹簧**（`1/157.9/17.6`），侧栏/面板 DOM 重排= **GSAP Flip**。
- **性能守则**：只动 transform/opacity；`will-change` 仅动画期间挂载；视口外节点剔除（culling）；`prefers-reduced-motion` 一律降级 ≤100ms 淡入；`prefers-reduced-transparency` 玻璃降实色。

### 可直接采用的 CSS Token
```css
:root{
  --bg-primary:#FFFFFF; --bg-secondary:#F2F2F7; --bg-tertiary:#E5E5EA; /* 深色 #000 #1C1C1E #2C2C2E */
  --label-primary:#000000; --label-secondary:rgba(60,60,67,.6); /* 深色对应 */
  --accent:#007AFF;            /* 深色 #0A84FF；iOS26 用 #0088FF */
  --success:#34C759; --danger:#FF3B30; --warning:#FF9500; --highlight:#FFCC00;
  --dur-instant:100ms; --dur-fast:150ms; --dur-base:250ms; --dur-slow:400ms; --dur-expressive:550ms;
  --ease-out:cubic-bezier(.16,1,.3,1); --ease-in:cubic-bezier(.7,0,.84,0);
  --ease-in-out:cubic-bezier(.45,0,.25,1); --ease-overshoot:cubic-bezier(.34,1.56,.64,1);
  --glass-blur:20px; --glass-saturate:1.8; --glass-bg:rgba(255,255,255,.55); /* 深色 rgba(30,30,32,.6) */
  --glass-border:1px solid rgba(255,255,255,.25); --glass-highlight:inset 0 1px 0 rgba(255,255,255,.15);
  --shadow-card:0 2px 12px rgba(0,0,0,.08),0 8px 32px rgba(0,0,0,.12);
  --shadow-float:0 16px 48px rgba(0,0,0,.20);
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:24px;
}
```

**来源**：[motion.dev gsap-vs-motion](https://motion.dev/docs/gsap-vs-motion) · [GSAP 安装](https://gsap.com/docs/v3/Installation/) · [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion/) · [SwiftUI Spring](https://developer.apple.com/documentation/swiftui/spring) · [react-spring 源码](https://raw.githubusercontent.com/pmndrs/react-spring/master/packages/core/src/constants.ts) · [CSS 弹簧 linear()](https://www.carmenansio.com/lab/spring-physics-css/) · [View Transitions MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) · [hig-mcp（WWDC25 色板）](https://github.com/aka-kika/hig-mcp) · [liquid-glass CSS](https://github.com/olii-dev/liquid-glass) · [WebKit blur bug](https://wiki.webkit.org/show_bug.cgi?id=316769) · [React Flow 动效示例](https://reactflow.dev/examples/edges/animating-edges) · [GSAP Flip](https://gsap.com/docs/v3/Plugins/Flip/) · [GSAP Draggable](https://gsap.com/docs/v3/Plugins/Draggable/) · [GSAP MotionPathPlugin](https://gsap.com/docs/v3/Plugins/MotionPathPlugin/)。

---

## 六、技术选型（定稿）

1. **画布**：`@xyflow/react`（React Flow v12）官方 UMD 单文件注入为基座；兜底自研「DOM 节点层 + SVG 边层 + transform 视口」。
2. **编排模型**：边负载（XCom 式）+ 共享 State + reducer 合并；边 = `{ from, to, intent(LLM生成), payloadSchema, injectInto }`。
3. **边语义生成**：LLM 生成 intent → JSON Schema 校验 → 注入，防漂移。
4. **Review**：多 judge 并行维度节点 + AdaRubric 动态 rubric + HITL 闸门 + 意见聚类去重。
5. **动效**：GSAP 3（UMD）+ CSS token/原生 transition + View Transitions；spring 参数统一（默认 `1/170-200/20-26`，强调动画用 Apple `1/157.9/17.6`）。
6. **配色**：DSH alias token 打底，Apple 风强调蓝以 HIG 官方为准（WWDC25 后倾向 `#0088FF`）。
7. **许可/发布**：MIT + npm OIDC Trusted Publishing + semantic-release + GitHub Actions。
8. **DSH 挂载**：`conversation.view` 新增 `workflow` 视图标签；host 用 `webServer` + `sessionProjections` + 私有 RPC。

---

## 变更日志

- 2026 规划：第 1 版研究报告（3/4 已完成，节点图库与 Apple 动效待补全）。
