# dsh-workflow-studio — 完整设计方案

> 配套：`BACKGROUND.md`（背景）、`RESEARCH.md`（调研/选型）。本文件定义系统架构、数据模型、交互、Review 与视觉规范。
> 状态：**设计草案 v0.1**，关键取舍待与你确认后冻结。

---

## 1. 定位与目标

一个 **DeepSeek Harness (DSH) 的 Web 插件**，把会话界面从「线性对话」升级为 **Plan → Action → Review 的可编排工作流画布**：

- 用户在 **Plan** 阶段输入粗略想法 → 系统自动调研；
- 在 **Action** 阶段以**自动生成**或**手动拖拽连线**的方式构建工作流；
- 在 **Review** 阶段进行多维度审核闭环，直至满足标准。

三大差异化：**动态连线（边携带语义并注入下游）**、**多维度 Review 自动去重 + 动态 rubric**、**文件作为可连线资产**。

---

## 2. 总体架构

```
┌────────────────────────── DSH Web 客户端（浏览器）─────────────────────────┐
│   conversation.view 新增 workflow 标签（replaceRisk:none，与 chat/trajectory 并列）│
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │ WorkflowCanvas（@xyflow/react 基座，UMD 注入）                    │     │
│   │   ├─ 节点层：Plan / Action(普通|PTC|Loop) / Review / 开始          │     │
│   │   ├─ 边层：有向边 + 语义标签 + 连接点(Handles)                     │     │
│   │   ├─ 文件气泡层：节点产出物可悬停/点击                              │     │
│   │   └─ 动效层：GSAP 3 + CSS token + View Transitions                │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│   conversation.input.dock：工作流运行状态全宽条（可选）                      │
│   shell.overlay：连线语义选择弹层 / 节点详情抽屉                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │ host.call / RPC (lossless JSON)
┌────────────────────────── DSH Host（Node.js）───────────────────────────────┐
│   lib/index.js                                                             │
│   ├─ 私有 RPC：workflow CRUD、edge.intent 生成、run 触发、审查执行           │
│   ├─ webServer：/api/dsh-workflow-studio（读取/写入工作流定义）              │
│   ├─ sessionProjections：会话 token/成本 投影（复用现有 dsh-plugin-graph 模式）│
│   └─ 对接 DSH：subagents / workflow worker / approval 栈 / plan-mode         │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Client**：React 手写 bundle（`window.__ModuleLoader__`），内联 CSS，注入 `@xyflow/react` UMD 与 GSAP UMD。
- **Host**：`lib/index.js` 注册 `webServer` 端点 + `sessionProjections` + 私有 RPC（`harness.handle` / `host.call`）。
- **持久化**：工作流定义（节点/边/文件引用/评审状态）以 JSON 存于工作区或 profile 目录；运行中间产物落盘为文件。

---

## 3. 数据模型

### 3.1 节点 `Node`

```ts
type NodeKind =
  | "start"            // 唯一开始节点
  | "research"         // 前期调查（第一性原理）
  | "summary"          // 总结
  | "plan"             // 计划（可含子步骤）
  | "action"           // Action 模块
  | "review"           // 审核/测试模块（可多实例，按维度）
  | "dimension"        // 维度节点（自动生成，避免重复审查）

interface Node {
  id: string
  kind: NodeKind
  title: string
  subSteps?: NodeSubStep[]   // 悬停展开的下级环节
  agent?: { preset: string; skills: string[]; prompt: string }  // 可编辑
  actionMode?: "normal" | "ptc" | "loop"
  files?: FileAsset[]        // 文件气泡
  pos: { x: number; y: number }
}
```

### 3.2 边（**核心创新**）`Edge`

```ts
interface Edge {
  id: string
  from: string
  to: string
  kind: EdgeKind            // 语义类型（由 LLM 从候选集选出或自定义）
  intent: string            // 这条线"要往 to 注入什么"（LLM 生成，可编辑）
  payloadSchema?: JSONSchema // intent 校验，防注入漂移
  injectInto: "prompt" | "context" | "fileRef" | "chat"
  fromPort?: string          // 多子步骤时：从哪个子步骤连出
  toPort?: string
}
```

> 边语义生成的流程（见 §5）：连接时弹**语义选择层** → 系统据 `from`/`to` 语义与目标生成候选意图 → 用户确认或改写 → 写入 `intent` → 落为 JSON Schema。

### 3.3 文件资产 `FileAsset`

```ts
interface FileAsset {
  id: string
  name: string
  path: string             // 落盘相对路径（引用而非整文件）
  kind: "doc" | "code" | "data" | "image" | ...
  summary?: string          // 悬停显示缩略
  nodeId: string            // 挂在哪个节点
  refs: string[]            // 被哪些边/节点引用
}
```

### 3.4 工作流 `Workflow`

```ts
interface Workflow {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
  plan?: string            // Plan 阶段产物（调研/意图）
  reviewCriteria?: string[] // Review 审核标准（可自动猜测后手动改）
  status: "draft" | "running" | "awaiting-review" | "done"
}
```

> 序列化采用 **JSON Canvas 开放规范**（`jsoncanvas.org`：`nodes`(id/x/y/width/height/color/file) + `edges`(fromNode/fromSide/toNode/toSide/label/color) + `groups`）并扩展本项目字段（`intent`/`payloadSchema`/`actionMode`/`files`）。可读、可移植、生态工具现成。

---

## 4. 三个阶段

### 4.1 Plan（简短对话模块）

- 用户输入粗略想法 → 系统以**分散调研姿态**运行多个调研代理：
  - (a) 调研现有相关知识；(b) 调查现成技术避免重复造轮子。
- 产物：`plan` 文本 + 可选 `research` 节点与竞品/资料**文件气泡**。
- Plan 也可作为节点嵌入工作流（不推荐，默认保持流水线干净）。

### 4.2 Action（工作流生成）

- **自动生成**：AI 依据 Plan 铺好工作流。
- **手动创建**：空白画布仅一个「开始」箭头，其余手动拖拽/连线。
- **开始节点**：右侧唯一；可「现在开启」或「定点开启」（保留 DeepSeek 外部运行、到点触发，默认选**波谷点**省费用）。

### 4.3 Review（多维度审核）

- 参考互联网公司**测试/审核部门**流程，包含测试、审核等模块并按需连接。
- **审核标准可拖拽设定**：连入审核节点后系统自动猜测，可改。
- **返工（Loop）**：自动生成返回箭头，拖向指定节点表示从此重做。
- **智能配置**：多同类节点→自动调整 prompt；检测重复 Review 维度→生成维度节点。

---

## 5. 动态连线（边携带语义）机制

这是全系统的灵魂，设计如下：

1. **连线建立**：从 A 的**连接点（Handle）**拖到 B 的连接点，形成有向边。
2. **触发语义生成**：连线完成瞬间，向 host 发起 `edge.intent` RPC，携带 `{ from, to, plan }`。
3. **候选意图生成**：host 用大模型生成**候选意图列表**（如从"开始"→"调研"→候选：`调查生活` / `调查什么` / `其他`）；若 from 是 Plan/文件，则据其生成（如竞品分析文档→调研内容）。
4. **确认弹层**：Client `shell.overlay` 弹出**选择层**（复选框式候选 + 自定义输入），确认后落为 `edge.intent`，并显示为**虚线上文字**；悬停文字显示完整意图。
5. **JSON Schema 校验**：intent 落为 `payloadSchema`，运行时注入前校验，防漂移。
6. **注入**：按 `injectInto` 注入到目标节点 Agent 的 prompt / context / 文件引用 / 对话。
7. **语义约束章程**：定义「哪些节点可连哪些节点」，用**连接点类型**（端口类型约束，借鉴 Langflow）限制任意乱连；有向性由端口方向决定。

---

## 6. 文件气泡与连线注入

- **节点产出**：运行后，产出文件以**气泡**挂在节点上（图标 + 名称；悬停显示缩略内容；点击打开详情）。
- **搜索阶段**：Plan 调研相关搜索结果按重要性排序，以**放大镜图标**挂在节点；悬停显示前几条，点击显示全部。
- **文件连线**（不同目标不同效果）：
  - 文件 → Action：作为**参考文件路径**注入（非整文件）；
  - 产品经理节点 → Action：将其分析内容+对话作为**参考文本**注入。

---

## 7. 三种 Action 模式

| 模式 | 语义 | 对标 DSH |
|---|---|---|
| 普通 normal | 单步工具调用，逐步执行 | 标准预设 native 呈现 |
| PTC ptc | 模型写 TypeScript 把多步工具调用串成一次执行 | code 预设 `tool-presentation mode: code` |
| Loop loop | 带 Review 条件边的自循环子图，迭代至通过 | Claude agentic loop / tool-goal |

---

## 8. Review / 审核系统

- **Review 节点** = generator + critic 双节点 + 条件边（PASS / REWORK）。
- **维度节点**：每维度一个并行 judge 子节点（销售审查 / 内容审查 / 测试 / 用户体验…）；rubric 用 **AdaRubric 式动态生成**（=自动调整 prompt）。
- **去重**：多维度意见做**聚类去重**，合并为唯一整改清单。
- **HITL 闸门**：Review 节点可「自动通过」或「转人工审批」（对标 LangGraph interrupt / AutoGen human_input_mode）。
- **Loop 返工**：未通过 → 沿返回箭头到指定节点重做。

---

## 9. 交互与视觉规范（Apple 级）

### 9.1 画布交互
- 节点悬停：自动展开下级环节（子步骤）；节点**点击**才显示详情（Agent 与技能接入、可编辑）。
- 连接点磁吸；有向箭头边；贝塞尔曲线。
- pan / zoom-to-cursor / 拖拽（复用现有引擎或 xyflow 内置）。
- 布局平滑重排（FLIP / GSAP），批量节点重排不跳动。

### 9.2 动效规范
- 主引擎 **GSAP 3**（UMD，23kb）；CSS token / 原生 transition 打底；View Transitions 做视图级转场。
- **Spring 参数统一**：默认 `mass 1 / stiffness 170–200 / damping 20–26`（克制、几乎不弹）；**Apple 强调弹簧 = `1 / 157.9 / 17.6`**（= `duration 0.5 + bounce 0.3` 官方换算）；Snappy `1/300/30`；Bouncy `1/100/10`。
- **时长分层**：instant 100ms（按下/触觉）· fast 150ms（hover/磁吸）· base 250ms（默认转场）· slow 400ms（面板/抽屉）· expressive 550ms（shared element）。
- **Easing**：`--ease-out: cubic-bezier(.16,1,.3,1)`（Apple 式快启慢停）· `--ease-in-out: cubic-bezier(.45,0,.25,1)` · `--ease-overshoot: cubic-bezier(.34,1.56,.64,1)`（弹入）。勿用 Material `(0.2,0,0,1)`。

### 9.3 视觉规范
- 用 DSH alias token 打底（`--dsw-alias-bg-*` / `border-*` / `label-*` / `brand-primary` / `state-*`）。
- Apple 风：玻璃拟态（`backdrop-filter: blur(20px) saturate(180%)` + 1px 描边 + inset 高光）、大圆角（12/16/24 三档）、柔和阴影（`0 2px 12px + 0 8px 32px`）、克制的强调色。
- 强调蓝以 HIG 官方为准：经典 `#007AFF`，**iOS 26 用 `#0088FF`**（落地前核对）。
- 节点用**精简钻石/图标 SVG + 文字**，拒绝纯文字。
- 节点拖拽只动 transform（rAF 直写，松手 120–180ms 短弹簧吸附）；连接点磁吸阈值 10–14px；边激活 `stroke-dashoffset` 流动、新建边 `pathLength` 0→1 生长、粒子沿边 GSAP MotionPath；画布批量重排=逐节点位置弹簧，侧栏 DOM 重排= GSAP Flip。
- **可访问性**：`prefers-reduced-motion` 一律降级 ≤100ms 淡入；`prefers-reduced-transparency` 玻璃降实色。
- 完整 CSS token 清单见 `RESEARCH.md §五`。

---

## 10. 挂载点与工程结构

- 挂载：`conversation.view` 新增 `workflow` 标签（`order` 定位，`label` 本地化，`inject` 注入 owner props）；`shell.overlay` 浮层；`conversation.input.dock` 可选运行条。
- 工程结构遵循《RESEARCH.md §4.4》模板：`lib/{index,workflow,client}.js` + `cordis.patch.yml` + `scripts/preflight.mjs` + `.github/workflows/{ci,release}.yml` + 中英双语 README + MIT LICENSE。

---

## 11. 实现路线图（建议里程碑）

1. **M0 骨架**：仓库初始化、CI、双语 README、cordis 注册、空 workflow 视图标签上线。
2. **M1 画布**：xyflow UMD 注入，开始节点 + 节点拖入 + 有向连线 + 连接点 + pan/zoom。
3. **M2 边语义**：`edge.intent` RPC + 候选意图生成 + 选择弹层 + 边标签 + JSON Schema 校验。
4. **M3 文件气泡**：节点产出文件气泡 + 悬停缩略 + 文件连线注入。
5. **M4 Review**：审核节点 + 维度去重 + Loop 返工箭头 + HITL 闸门。
6. **M5 动效打磨**：GSAP 统一、View Transitions、Apple 级视觉规范落地。
7. **M6 发布**：打包、测试、上传 `EaveBounty/dsh-workflow-studio` + npm。

---

## 12. 待确认的开放问题

1. 定点开启的"波谷点调度"是否首版实现，还是仅保留开关？
2. 工作流持久化位置：工作区 `.dsh-workflow/` 还是 profile 目录？
3. Plan 阶段的调研代理，是否直接复用 DSH 的 `deep-research` skill / 子代理？
4. Review 的 HITL 审批，首版是否接 DSH 既有 approval 栈？
5. `@xyflow/react` UMD 的具体注入方式需在 M1 验证可行性。

---

## 变更日志

- 2026 规划：v0.1 设计草案，综合四项调研结论撰写。
