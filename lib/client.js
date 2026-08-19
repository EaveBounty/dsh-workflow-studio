// @dsh-local/dsh-workflow-studio — web client (hand-validated JSX bundle, no build step).
// Registers a `workflow` tab in conversation.view and renders a Plan→Action→Review
// canvas. xyflow (React Flow) and GSAP are injected as UMD globals (window.ReactFlow / window.gsap).
window.__ModuleLoader__.load({
	id: "dsh-workflow-studio",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const { jsx, jsxs, Fragment } = react_jsx_runtime;

		// Expose React (and react-dom if the loader provides it) for the injected xyflow UMD,
		// which externalizes react / react-dom / react/jsx-runtime as globals.
		let react_dom = null;
		try { react_dom = require("react-dom"); } catch (e) { react_dom = null; }
		if (typeof window !== "undefined") {
			window.React = window.React || react;
			window.jsxRuntime = window.jsxRuntime || react_jsx_runtime;
			if (react_dom && !window.ReactDOM) window.ReactDOM = react_dom;
		}

		//#region CSS tokens + styles (Apple-grade)
		const css = `
:root{
  --ws-accent:#007AFF; --ws-accent-dark:#0A84FF;
  --ws-bg:#FFFFFF; --ws-bg-2:#F2F2F7; --ws-bg-3:#E5E5EA;
  --ws-label:#000000; --ws-label-2:rgba(60,60,67,.6);
  --ws-success:#34C759; --ws-danger:#FF3B30; --ws-warning:#FF9500;
  --ws-dur-instant:100ms; --ws-dur-fast:150ms; --ws-dur-base:250ms; --ws-dur-slow:400ms; --ws-dur-expressive:550ms;
  --ws-ease-out:cubic-bezier(.16,1,.3,1); --ws-ease-in-out:cubic-bezier(.45,0,.25,1); --ws-ease-over:cubic-bezier(.34,1.56,.64,1);
  --ws-glass-blur:20px; --ws-glass-saturate:1.8; --ws-glass-bg:rgba(255,255,255,.55); --ws-glass-border:1px solid rgba(255,255,255,.25);
  --ws-glass-highlight:inset 0 1px 0 rgba(255,255,255,.15);
  --ws-shadow-card:0 2px 12px rgba(0,0,0,.08),0 8px 32px rgba(0,0,0,.12);
  --ws-shadow-float:0 16px 48px rgba(0,0,0,.20);
  --ws-r-sm:8px; --ws-r-md:12px; --ws-r-lg:16px; --ws-r-xl:24px;
}
.ws-view{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;font-size:13px;color:var(--dsw-alias-label-primary,var(--ws-label));background:var(--dsw-alias-bg-base,var(--ws-bg))}
.ws-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));flex:none;backdrop-filter:blur(var(--ws-glass-blur)) saturate(var(--ws-glass-saturate));background:var(--ws-glass-bg)}
.ws-title{font-size:14px;font-weight:600;margin:0}
.ws-sub{color:var(--dsw-alias-label-secondary,var(--ws-label-2));font-size:11px}
.ws-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));background:var(--dsw-alias-bg-layer-1,var(--ws-bg));color:var(--dsw-alias-label-primary,var(--ws-label));border-radius:var(--ws-r-sm);padding:5px 12px;font-size:12px;cursor:pointer;transition:transform var(--ws-dur-fast) var(--ws-ease-out),background var(--ws-dur-fast) var(--ws-ease-out)}
.ws-btn:hover{background:var(--dsw-alias-interactive-bg-hover,var(--ws-bg-2));transform:scale(1.02)}
.ws-btn:active{transform:scale(.98)}
.ws-btn.primary{background:var(--ws-accent);border-color:transparent;color:#fff}
.ws-btn.primary:hover{filter:brightness(1.05)}
.ws-body{flex:1;min-height:0;position:relative;display:flex}
.ws-palette{width:190px;flex:none;border-right:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto}
.ws-palette h5{margin:0 0 4px;font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2));text-transform:uppercase;letter-spacing:.04em}
.ws-palItem{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));border-radius:var(--ws-r-sm);background:var(--dsw-alias-bg-layer-1,var(--ws-bg));cursor:grab;font-size:12px;transition:box-shadow var(--ws-dur-fast) var(--ws-ease-out),transform var(--ws-dur-fast) var(--ws-ease-out)}
.ws-palItem:hover{box-shadow:var(--ws-shadow-card);transform:translateY(-1px)}
.ws-palItem svg{flex:none}
.ws-canvas{flex:1;min-width:0;position:relative}
.ws-node{display:flex;flex-direction:column;gap:4px;padding:8px 12px;border-radius:var(--ws-r-md);border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));background:var(--dsw-alias-bg-overlay,var(--ws-bg));box-shadow:var(--ws-shadow-card);font-size:12px;transition:transform var(--ws-dur-fast) var(--ws-ease-out),box-shadow var(--ws-dur-fast) var(--ws-ease-out)}
.ws-node:hover{box-shadow:var(--ws-shadow-float)}
.ws-node .ws-nodeHead{display:flex;align-items:center;gap:6px;font-weight:600}
.ws-node .ws-nodeSub{color:var(--dsw-alias-label-secondary,var(--ws-label-2));font-size:11px;max-width:180px}
.ws-node .ws-fileRow{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ws-accent);cursor:pointer}
.ws-node .ws-handle{width:10px;height:10px;background:var(--ws-accent);border:2px solid var(--dsw-alias-bg-overlay,var(--ws-bg));border-radius:50%}
.ws-overlay{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center}
.ws-card{width:min(420px,calc(100vw-32px));border-radius:var(--ws-r-lg);background:var(--dsw-alias-bg-overlay,var(--ws-bg));color:var(--dsw-alias-label-primary,var(--ws-label));box-shadow:var(--ws-shadow-float);padding:16px;display:flex;flex-direction:column;gap:10px;animation:ws-pop var(--ws-dur-slow) var(--ws-ease-over)}
@keyframes ws-pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
.ws-card h4{margin:0;font-size:14px}
.ws-cand{display:flex;align-items:flex-start;gap:8px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));border-radius:var(--ws-r-sm);cursor:pointer;transition:background var(--ws-dur-fast) var(--ws-ease-out)}
.ws-cand:hover{background:var(--dsw-alias-interactive-bg-hover,var(--ws-bg-2))}
.ws-cand.on{background:rgba(0,122,255,.12);border-color:var(--ws-accent)}
.ws-cand .ws-candT{font-weight:600}
.ws-cand .ws-candD{font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
.ws-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));flex:none}
/* ==M3 file bubbles== */
.ws-files{display:flex;flex-direction:column;gap:3px;margin-top:2px}
.ws-fileRow{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2));cursor:pointer;padding:3px 6px;border-radius:6px;transition:background var(--ws-dur-fast) var(--ws-ease-out)}
.ws-fileRow:hover{background:var(--dsw-alias-interactive-bg-hover,var(--ws-bg-2));color:var(--ws-accent)}
.ws-fileRow svg{flex:none}
.ws-fileBtn{font-size:10px;color:var(--ws-accent);border:1px dashed var(--dsw-alias-border-l2,var(--ws-bg-3));border-radius:6px;padding:2px 8px;background:transparent;cursor:pointer;transition:transform var(--ws-dur-fast) var(--ws-ease-out)}
.ws-fileBtn:hover{transform:scale(1.03)}
/* ==M4 review== */
.ws-reviewList{display:flex;flex-direction:column;gap:4px;margin-top:2px;max-height:120px;overflow:auto}
.ws-reviewItem{display:flex;align-items:flex-start;gap:6px;font-size:11px;padding:3px 6px;border-radius:6px;background:var(--dsw-alias-bg-layer-1,var(--ws-bg-2))}
.ws-reviewItem .ws-dim{font-weight:600;color:var(--dsw-alias-label-primary,var(--ws-label))}
.ws-reviewItem .ws-issue{color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
.ws-reviewItem.pass{border-left:2px solid var(--ws-success)}
.ws-reviewItem.fail{border-left:2px solid var(--ws-danger)}
.ws-reworkTag{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--ws-warning);border:1px solid rgba(255,149,0,.5);border-radius:99px;padding:1px 8px}
.ws-dedupeBtn{margin-left:auto;font-size:11px;color:var(--ws-accent);border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));border-radius:6px;padding:2px 8px;background:transparent;cursor:pointer}
.ws-dedupeBtn:hover{background:rgba(0,122,255,.1)}
/* ==M5 animation== */
@keyframes ws-edge-flow{to{stroke-dashoffset:-24}}
.ws-edgeFlow{stroke-dasharray:6 6;animation:ws-edge-flow 1s linear infinite}
/* ==M6 runtime visualization + bubbles + rollback== */
@keyframes ws-breath{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.18);opacity:.95}}
.ws-node{position:relative}
.ws-ring{position:absolute;inset:-7px;border-radius:var(--ws-r-lg);border:2px solid var(--ws-danger);pointer-events:none;animation:ws-breath 1.4s ease-in-out infinite}
.ws-bubble{margin-top:6px;padding:6px 8px;border-radius:var(--ws-r-sm);background:var(--dsw-alias-bg-layer-2,var(--ws-bg-2));border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2));max-width:210px;word-break:break-word}
.ws-bubble .ws-sum{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ws-bubble .ws-detail{display:none}
.ws-bubble:hover .ws-detail{display:block;color:var(--dsw-alias-label-primary,var(--ws-label));white-space:pre-wrap}
.ws-bubble.pending{color:var(--dsw-alias-label-tertiary,var(--ws-label-2));font-style:italic}
.ws-node.bubble-float .ws-bubble{display:none}
.ws-node.bubble-float:hover .ws-bubble{display:block;position:absolute;top:100%;left:0;z-index:6;box-shadow:var(--ws-shadow-card)}
.ws-rollback{font-size:10px;color:var(--ws-warning);border:1px solid rgba(255,149,0,.5);border-radius:6px;padding:1px 7px;background:transparent;cursor:pointer;margin-top:4px;align-self:flex-start}
.ws-rollback:hover{background:rgba(255,149,0,.12)}
.ws-status{font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
.ws-edgeActive path{stroke:var(--ws-danger)!important;stroke-dasharray:6 6;animation:ws-edge-flow 1s linear infinite}
.ws-runbar{display:flex;align-items:center;gap:10px}
@media (prefers-reduced-motion:reduce){.ws-card{animation:none}.ws-btn,.ws-node,.ws-fileRow,.ws-fileBtn,.ws-reviewItem{transition:none}.ws-edgeFlow{animation:none}.ws-ring{animation:none}.ws-edgeActive path{animation:none}}
`;
		const tagId = "dsh-workflow-studio/styles";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-workflow-studio";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region locales
		const NS = "workflow-studio";
		const zh = {
			"view.workflow": "工作流",
			"title": "工作流编排",
			"sub": "Plan → Action → Review",
			"palette": "节点",
			"pal.research": "调研",
			"pal.summary": "总结",
			"pal.plan": "计划",
			"pal.action": "执行",
			"pal.review": "审核",
			"node.start": "开始",
			"add": "添加节点",
			"save": "保存",
			"saved": "已保存",
			"edge.title": "这条连线的目的",
			"edge.hint": "选择或输入要注入到下游节点的内容",
			"edge.custom": "其他 / 自定义",
			"edge.placeholder": "输入该边的目的…",
			"confirm": "确认",
			"cancel": "取消",
			"notAllowed": "该连线不允许",
			"loading": "加载中…",
			"empty": "从左侧拖入节点，开始构建工作流"
		};
		const en = {
			"view.workflow": "Workflow",
			"title": "Workflow Studio",
			"sub": "Plan → Action → Review",
			"palette": "Nodes",
			"pal.research": "Research",
			"pal.summary": "Summary",
			"pal.plan": "Plan",
			"pal.action": "Action",
			"pal.review": "Review",
			"node.start": "Start",
			"add": "Add node",
			"save": "Save",
			"saved": "Saved",
			"edge.title": "Purpose of this connection",
			"edge.hint": "Choose what to inject into the downstream node",
			"edge.custom": "Other / custom",
			"edge.placeholder": "Type this edge's purpose…",
			"confirm": "Confirm",
			"cancel": "Cancel",
			"notAllowed": "Connection not allowed",
			"loading": "Loading…",
			"empty": "Drag nodes from the left to start building"
		};
		//#endregion

		//#region UMD injection
		function injectScript(src) {
			return new Promise((resolve, reject) => {
				if (typeof document === "undefined") { resolve(); return; }
				const s = document.createElement("script");
				s.src = src; s.async = true;
				s.onload = () => resolve();
				s.onerror = () => reject(new Error("failed to load " + src));
				document.head.appendChild(s);
			});
		}
		// In DSH web the client bundle is served offline-friendly; prefer local fallback via CDN.
		function ensureRuntime(onReady) {
			const load = async () => {
				if (window.ReactFlow && window.gsap) { onReady(); return; }
				try {
					if (!window.ReactFlow) await injectScript("https://cdn.jsdelivr.net/npm/@xyflow/react@12.11.3/dist/umd/index.js");
					if (!window.gsap) await injectScript("https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js");
				} catch (e) { /* offline — will stay degraded */ }
				onReady();
			};
			load();
		}
		//#endregion

		//#region icons
		function diamondIcon(color) {
			return jsx("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: color || "currentColor", children: jsx("path", { d: "M8 1l5 7-5 7-5-7z" }) });
		}
		//#endregion

		//#region node component
		// Module-level handler: keeps callbacks out of serialized node.data (functions
		// are dropped by JSON.stringify), so persisted workflows reload correctly.
		let attachHandler = null;
		let rollbackHandler = null;
		let bubbleMode = "default"; // "default" | "float"
		function fileIcon() {
			return jsx("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", "stroke-width": 1.3, children: [
				jsx("path", { d: "M3 2.5h6l4 4V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" }),
				jsx("path", { d: "M9 2.5V6h3.5" })
			] });
		}
		function WorkflowNode({ data, selected }) {
			const onAttach = attachHandler;
			const onRollback = rollbackHandler;
			const review = data.kind === "review" && Array.isArray(data.reviewItems) ? data.reviewItems : [];
			const rt = data.runtime || { status: "idle", summary: "", detail: "", history: [] };
			const bubbleCls = "ws-bubble" + (rt.status === "done" ? "" : " pending") + (bubbleMode === "float" ? " hidden" : "");
			return jsxs("div", { className: "ws-node" + (selected ? " sel" : "") + (bubbleMode === "float" ? " bubble-float" : " bubble-default"), children: [
				rt.status === "running" ? jsx("div", { className: "ws-ring" }) : null,
				jsx("div", { className: "ws-nodeHead", children: [
					diamondIcon(data.iconColor || "var(--ws-accent)"),
					jsx("span", { children: data.title }),
					rt.status === "done" ? jsx("span", { className: "ws-status", style: { color: "var(--ws-success)" }, children: "✓" }) : null,
					data.kind === "review" ? jsx("span", { className: "ws-reworkTag", title: "可连接 Action 作为返工", children: "返工" }) : null
				] }),
				data.sub ? jsx("div", { className: "ws-nodeSub", children: data.sub }) : null,
				data.kind === "review" && review.length ? jsxs("div", { className: "ws-reviewList", children: review.map((r, i) => jsxs("div", {
					className: "ws-reviewItem" + (r.pass ? " pass" : " fail"), key: i,
					children: [jsx("span", { className: "ws-dim", children: r.dimension }), jsx("span", { className: "ws-issue", children: r.issue })]
				})) }) : null,
				Array.isArray(data.files) && data.files.length ? jsxs("div", { className: "ws-files", children: data.files.map((f) => jsx("div", {
					className: "ws-fileRow", key: f.id, title: f.summary || f.path || f.name,
					children: [fileIcon(), jsx("span", { children: f.name })]
				})) }) : null,
				typeof onAttach === "function" ? jsx("button", { type: "button", className: "ws-fileBtn", onClick: (e) => { e.stopPropagation(); onAttach(data.id); }, children: "＋ 文件" }) : null,
				rt.status === "done" ? jsxs("div", { className: bubbleCls, children: [
					jsx("div", { className: "ws-sum", children: rt.summary || "（待概括）" }),
					rt.detail ? jsx("div", { className: "ws-detail", children: rt.detail }) : null
				] }) : (rt.status === "running" ? jsx("div", { className: bubbleCls + " pending", children: "执行中…" }) : null),
				rt.status === "done" && typeof onRollback === "function" ? jsx("button", { type: "button", className: "ws-rollback", onClick: (e) => { e.stopPropagation(); onRollback(data.id); }, children: "回退" }) : null
			] });
		}
		//#endregion

		//#region WorkflowView
		function WorkflowView({ t, sessionId }) {
			const [ready, setReady] = react.useState(false);
			const [nodes, setNodes] = react.useState([]);
			const [edges, setEdges] = react.useState([]);
			const [plan, setPlan] = react.useState("");
			const [overlay, setOverlay] = react.useState(null);
			const [saved, setSaved] = react.useState(false);
			const pendingAnimateRef = react.useRef(new Set());

			react.useEffect(() => { ensureRuntime(() => setReady(true)); }, []);

			// Keep the module-level attach handler in sync with this view instance.
			react.useEffect(() => { attachHandler = attachFile; }, []);

			// Seed with a start node once runtime is ready.
			react.useEffect(() => {
				if (!ready || nodes.length) return;
				setNodes([{ id: "start-1", type: "workflow", position: { x: 40, y: 140 }, data: { title: t("node.start"), kind: "start", iconColor: "#FF9500", files: [] } }]);
			}, [ready]);

			// M5: animate newly added nodes (pop-in) once rendered.
			react.useEffect(() => {
				if (pendingAnimateRef.current.size === 0) return;
				const timer = window.setTimeout(() => {
					pendingAnimateRef.current.forEach((id) => {
						const el = document.querySelector(`.react-flow__node[data-id="${id}"] .ws-node`);
						if (el) { playNodeIn(el); pendingAnimateRef.current.delete(id); }
					});
				}, 50);
				return () => window.clearTimeout(timer);
			}, [nodes]);

			if (!ready) return jsx("div", { className: "ws-view", children: jsx("div", { className: "ws-title", children: t("loading") }) });
			if (!window.ReactFlow) return jsx("div", { className: "ws-view", children: jsx("div", { className: "ws-title", children: "React Flow 注入失败（离线）" }) });

			const RF = window.ReactFlow;
			const nodeTypes = { workflow: (p) => jsx(WorkflowNode, { data: p.data, selected: p.selected }) };

			const paletteItems = [
				{ kind: "research", label: t("pal.research"), color: "#007AFF", sub: "第一性原理 · 前期调查" },
				{ kind: "summary", label: t("pal.summary"), color: "#34C759", sub: "汇总 / 分析" },
				{ kind: "plan", label: t("pal.plan"), color: "#AF52DE", sub: "产品 / 功能 / 需求经理" },
				{ kind: "action", label: t("pal.action"), color: "#FF2D55", sub: "普通 / PTC / Loop" },
				{ kind: "review", label: t("pal.review"), color: "#FF9500", sub: "测试 / 审核" }
			];

			const attachFile = (nodeId) => {
				const name = window.prompt("文件名 / 路径");
				if (!name) return;
				setNodes((prev) => prev.map((n) => {
					if (n.id !== nodeId) return n;
					const files = Array.isArray(n.data.files) ? n.data.files : [];
					return { ...n, data: { ...n.data, files: [...files, { id: `f-${Date.now()}`, name, path: name, kind: "doc" }] } };
				}));
			};

			const addReviewItem = (nodeId, item) => {
				setNodes((prev) => prev.map((n) => {
					if (n.id !== nodeId) return n;
					const reviewItems = Array.isArray(n.data.reviewItems) ? n.data.reviewItems : [];
					return { ...n, data: { ...n.data, reviewItems: [...reviewItems, item] } };
				}));
			};

			const dedupeReviews = async (nodeId) => {
				const node = nodes.find((n) => n.id === nodeId);
				if (!node) return;
				const items = Array.isArray(node.data.reviewItems) ? node.data.reviewItems : [];
				try {
					const res = await fetch("/api/dsh-workflow-studio/review-dedupe", {
						method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviews: items })
					});
					const data = await res.json();
					if (data.ok) {
						setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, reviewItems: data.reviews } } : n));
					}
				} catch { /* offline */ }
			};

			// M6: runtime + rollback
			const [bubbleModeState, setBubbleModeState] = react.useState("default");
			const [runId, setRunId] = react.useState(1);
			const [running, setRunning] = react.useState(false);
			react.useEffect(() => { bubbleMode = bubbleModeState; }, [bubbleModeState]);
			react.useEffect(() => { rollbackHandler = rollbackNode; }, [nodes]);

			const setNodeRuntime = (id, patch) => {
				setNodes((prev) => prev.map((n) => {
					if (n.id !== id) return n;
					const rt = { status: "idle", summary: "", detail: "", history: [], ...(n.data.runtime || {}), ...patch };
					if (patch.status === "done") rt.history = [...(rt.history || []), { runId: rt.runId, status: "done", summary: rt.summary, detail: rt.detail, at: Date.now() }];
					return { ...n, data: { ...n.data, runtime: rt } };
				}));
			};

			const summarize = async (id, node) => {
				try {
					const res = await fetch("/api/dsh-workflow-studio/summarize", {
						method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ node: { kind: node.kind, title: node.title }, plan })
					});
					const data = await res.json();
					if (data.ok) setNodeRuntime(id, { status: "done", summary: data.summary, detail: data.detail });
					else setNodeRuntime(id, { status: "done", summary: "（完成，无摘要）", detail: "" });
				} catch { setNodeRuntime(id, { status: "done", summary: "（完成，离线无摘要）", detail: "" }); }
			};

			const run = () => {
				if (running) return;
				setRunning(true);
				const rid = runId;
				setRunId(rid + 1);
				const order = nodes.map((n) => n.id);
				let i = 0;
				const tick = () => {
					if (i >= order.length) { setRunning(false); return; }
					const id = order[i];
					setNodeRuntime(id, { status: "running", runId: rid });
					window.setTimeout(() => {
						const node = nodes.find((n) => n.id === id);
						summarize(id, node || { kind: "", title: "" });
						i++;
						tick();
					}, 700);
				};
				window.setTimeout(tick, 300);
			};

			const rollbackNode = (id) => {
				const rt = nodes.find((n) => n.id === id)?.data?.runtime;
				if (!rt || !rt.history || !rt.history.length) return;
				setNodes((prev) => {
					const map = Object.fromEntries(prev.map((n) => [n.id, n]));
					const nextRt = { ...rt, pointer: Math.max(0, (rt.pointer ?? rt.history.length) - 1) };
					const patch = new Map();
					patch.set(id, { ...nextRt, status: "idle", summary: "", detail: "" });
					// cascade: reset downstream to blank
					const stack = [id];
					while (stack.length) {
						const cur = stack.pop();
						for (const e of edges) {
							if (e.source !== cur) continue;
							if (!patch.has(e.target)) { patch.set(e.target, { status: "idle", summary: "", detail: "", history: [], pointer: 0 }); stack.push(e.target); }
						}
					}
					return prev.map((n) => patch.has(n.id)
						? { ...n, data: { ...n.data, runtime: patch.get(n.id) } }
						: n);
				});
			};

			const activeEdgeIds = new Set();
			if (running) for (const n of nodes) if (n.data?.runtime?.status === "running") for (const e of edges) if (e.source === n.id) activeEdgeIds.add(e.id);
			const displayEdges = edges.map((e) => activeEdgeIds.has(e.id) ? { ...e, className: "ws-edgeActive", style: { stroke: "#FF3B30" } } : e);

			const addNode = (item) => {
				const id = `${item.kind}-${Date.now()}`;
				const data = { title: item.label, kind: item.kind, sub: item.sub, iconColor: item.color, files: [] };
				if (item.kind === "review") data.reviewItems = [{ dimension: "功能完整性", issue: "待补充评审项", pass: false }];
				const n = { id, type: "workflow", position: { x: 60 + Math.random() * 120, y: 60 + Math.random() * 140 }, data };
				setNodes((prev) => [...prev, n]);
				pendingAnimateRef.current.add(id);
			};

			const onConnect = (conn) => {
				const from = nodes.find((n) => n.id === conn.source);
				const to = nodes.find((n) => n.id === conn.target);
				if (!from || !to) return;
				// M4: review → action is a rework edge by default.
				const isRework = from.data.kind === "review" && to.data.kind === "action";
				fetch("/api/dsh-workflow-studio/edge-intent", {
					method: "POST", headers: { "content-type": "application/json" },
					body: JSON.stringify({ fromKind: from.data.kind, toKind: to.data.kind, plan })
				}).then((r) => r.json()).then((res) => {
					if (isRework) {
						const edge = { id: `e-${Date.now()}`, source: conn.source, target: conn.target, label: "返工", type: "smoothstep", data: { kind: "rework-target", detail: "Loop：从该 Action 重做" } };
						setEdges((prev) => [...prev, edge]);
						return;
					}
					if (!res.ok || !res.allowed) { return; }
					setOverlay({
						conn, candidates: res.candidates || [],
						onConfirm: (intent) => {
							const edge = { id: `e-${Date.now()}`, source: conn.source, target: conn.target, label: intent.label, type: "smoothstep", data: { kind: intent.kind, detail: intent.detail } };
							setEdges((prev) => [...prev, edge]);
							window.setTimeout(() => {
								const path = document.querySelector(`.react-flow__edge[data-id="${edge.id}"] path`);
								if (path) flowEdge(path);
							}, 60);
							setOverlay(null);
						}
					});
				}).catch(() => { /* offline — connect plain */ });
			};

			const save = () => {
				fetch("/api/dsh-workflow-studio/workflow", {
					method: "POST", headers: { "content-type": "application/json" },
					body: JSON.stringify({ id: "default", name: t("title"), nodes, edges, plan, status: "draft" })
				}).then((r) => r.json()).then(() => { setSaved(true); window.setTimeout(() => setSaved(false), 1500); });
			};

			return jsxs("div", { className: "ws-view", children: [
				jsxs("div", { className: "ws-toolbar", children: [
					jsx("h3", { className: "ws-title", children: t("title") }),
					jsx("span", { className: "ws-sub", children: t("sub") }),
					jsx("div", { className: "ws-runbar", children: [
						jsx("select", { value: bubbleModeState, onChange: (e) => setBubbleModeState(e.target.value), title: "气泡显示模式", style: { fontSize: 12 }, children: [
							jsx("option", { value: "default", children: "气泡·常显" }),
							jsx("option", { value: "float", children: "气泡·悬浮" })
						] }),
						jsx("button", { className: "ws-btn" + (running ? "" : " primary"), onClick: run, disabled: running, children: running ? "运行中…" : "运行" }),
						jsx("button", { className: "ws-btn primary", onClick: save, children: saved ? t("saved") : t("save") })
					] })
				] }),
				jsxs("div", { className: "ws-body", children: [
					jsxs("div", { className: "ws-palette", children: [
						jsx("h5", { children: t("palette") }),
						paletteItems.map((item) => jsxs("div", {
							className: "ws-palItem", key: item.kind,
							onClick: () => addNode(item),
							children: [diamondIcon(item.color), jsx("span", { children: item.label })]
						}))
					] }),
					jsx("div", { className: "ws-canvas", children: jsx(RF.ReactFlow, {
						nodes, edges: displayEdges, nodeTypes, onConnect, fitView: true,
						children: [
							jsx(RF.Background, {}),
							jsx(RF.MiniMap, {}),
							jsx(RF.Controls, {})
						]
					}) })
				] }),
				jsx("div", { className: "ws-foot", children: [
					jsx("input", { value: plan, onChange: (e) => setPlan(e.target.value), placeholder: "Plan / 目标…", style: { flex: 1, minWidth: 0 } })
				] }),
				overlay ? jsx(EdgeOverlay, { overlay, onCancel: () => setOverlay(null), t }) : null
			] });
		}
		//#endregion

		//#region EdgeOverlay
		function EdgeOverlay({ overlay, onCancel, t }) {
			const [sel, setSel] = react.useState(0);
			const [custom, setCustom] = react.useState("");
			return jsx("div", { className: "ws-overlay", onClick: (e) => { if (e.target === e.currentTarget) onCancel(); }, children: jsxs("div", { className: "ws-card", children: [
				jsx("h4", { children: t("edge.title") }),
				jsx("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" }, children: t("edge.hint") }),
				overlay.candidates.map((c, i) => jsxs("div", {
					className: "ws-cand" + (sel === i ? " on" : ""), key: i, onClick: () => setSel(i),
					children: [jsx("div", { className: "ws-candT", children: c.label }), jsx("div", { className: "ws-candD", children: c.detail })]
				})),
				jsxs("div", { className: "ws-cand", onClick: () => setSel(overlay.candidates.length), children: [
					jsx("div", { className: "ws-candT", children: t("edge.custom") })
				] }),
				sel >= overlay.candidates.length ? jsx("input", { value: custom, onChange: (e) => setCustom(e.target.value), placeholder: t("edge.placeholder"), autoFocus: true }) : null,
				jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 }, children: [
					jsx("button", { className: "ws-btn", onClick: onCancel, children: t("cancel") }),
					jsx("button", { className: "ws-btn primary", onClick: () => {
						const chosen = sel < overlay.candidates.length ? overlay.candidates[sel] : { kind: "custom", label: custom || t("edge.custom"), detail: custom || "" };
						overlay.onConfirm(chosen);
					}, children: t("confirm") })
				] })
			] }) });
		}
		//#endregion

		//#region animation (M5)
		// Apple spring constants: emphasise 1/157.9/17.6 (~0.5s + bounce .3).
		function playNodeIn(el) {
			if (!window.gsap || !el) return;
			window.gsap.fromTo(el, { opacity: 0, scale: 0.8, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "elastic.out(1, 0.55)" });
		}
		function playOverlayIn(el) {
			if (!window.gsap || !el) return;
			window.gsap.fromTo(el, { opacity: 0, y: 12, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "elastic.out(1, 0.6)" });
		}
		function flowEdge(el) {
			if (!el) return;
			el.classList.add("ws-edgeFlow");
		}
		//#endregion

		//#region index
		const inject = ["slots", "locale", "sessions"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "workflow-studio: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "workflow",
				order: 20,
				locale: NS,
				label: () => t("view.workflow")
			}, (props) => jsx(WorkflowView, { t, sessionId: props.sessionId })));
		}
		//#endregion

		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
