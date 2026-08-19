const dshWorkflowStudioFactory = (require) => {
		// @dsh-local/dsh-workflow-studio — web client (hand-validated JSX bundle, no build step).
		// Registers a `workflow` tab in conversation.view and renders the NEW tree workflow:
		//   - Double-column view: LEFT = "workflow builder chat" (natural-language request →
		//     heuristic tree generation / growth), RIGHT = tree canvas (React Flow).
		//   - Node kinds from lib/tree.js: root/plan/action/review/summary/dimension/loop; every
		//     node references an agentId from the preset registry or a user-custom agent.
		//   - Review landing semantics guessed on connect via POST /review-landing (loop-gate
		//     when the target is a loop, review-feedback otherwise); edge label is editable.
		//   - Run: POST /run with the compiled tree; backfill value.results[nodeId] onto node
		//     bubbles and value.outputs[nodeId] onto per-branch file bubbles. When the native
		//     engine is absent ({ok:false, simulation:true}) or offline, show a clear simulation
		//     badge and still run a local staged simulation so the UX works.
		// xyflow (React Flow) and GSAP are injected as UMD globals (window.ReactFlow / window.gsap).
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
  --ws-accent:var(--dsw-alias-brand-primary,#007AFF); --ws-accent-dark:#0A84FF;
  --ws-bg:#FFFFFF; --ws-bg-2:#F2F2F7; --ws-bg-3:#E5E5EA;
  --ws-label:#000000; --ws-label-2:rgba(60,60,67,.6);
  --ws-success:#34C759; --ws-danger:#FF3B30; --ws-warning:#FF9500;
  --ws-dur-instant:100ms; --ws-dur-fast:150ms; --ws-dur-base:250ms; --ws-dur-slow:400ms; --ws-dur-expressive:550ms;
  --ws-ease-out:cubic-bezier(.16,1,.3,1); --ws-ease-in-out:cubic-bezier(.45,0,.25,1); --ws-ease-over:cubic-bezier(.34,1.56,.64,1);
  --ws-glass-blur:20px; --ws-glass-saturate:1.8; --ws-glass-bg:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.55)); --ws-glass-border:1px solid rgba(255,255,255,.25);
  --ws-glass-highlight:inset 0 1px 0 rgba(255,255,255,.15);
  --ws-shadow-card:0 2px 12px rgba(0,0,0,.08),0 8px 32px rgba(0,0,0,.12);
  --ws-shadow-float:0 16px 48px rgba(0,0,0,.20);
  --ws-r-sm:8px; --ws-r-md:12px; --ws-r-lg:16px; --ws-r-xl:24px;
}
.ws-view{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;font-size:13px;color:var(--dsw-alias-label-primary,var(--ws-label));background:var(--dsw-alias-bg-base,var(--ws-bg));color-scheme:light dark}
.ws-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));flex:none;backdrop-filter:blur(var(--ws-glass-blur)) saturate(var(--ws-glass-saturate));background:var(--ws-glass-bg);flex-wrap:wrap}
.ws-title{font-size:14px;font-weight:600;margin:0}
.ws-sub{color:var(--dsw-alias-label-secondary,var(--ws-label-2));font-size:11px}
.ws-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));background:var(--dsw-alias-bg-layer-1,var(--ws-bg));color:var(--dsw-alias-label-primary,var(--ws-label));border-radius:var(--ws-r-sm);padding:5px 12px;font-size:12px;cursor:pointer;transition:transform var(--ws-dur-fast) var(--ws-ease-out),background var(--ws-dur-fast) var(--ws-ease-out)}
.ws-btn:hover{background:var(--dsw-alias-interactive-bg-hover,var(--ws-bg-2));transform:scale(1.02)}
.ws-btn:active{transform:scale(.98)}
.ws-btn.primary{background:var(--ws-accent);border-color:transparent;color:var(--dsw-alias-label-primary-inverse,#fff)}
.ws-btn.primary:hover{filter:brightness(1.05)}
.ws-btn:disabled{opacity:.55;cursor:default;transform:none}
.ws-btnSm{padding:3px 8px;font-size:11px}
.ws-body{flex:1;min-height:0;position:relative;display:flex}
/* == left: builder chat == */
.ws-chat{width:360px;flex:none;display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));background:var(--dsw-alias-bg-layer-0,var(--ws-bg-2))}
.ws-chatHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;font-size:12px;font-weight:600;border-bottom:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));flex:none}
.ws-msgs{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:12px}
.ws-chatEmpty{color:var(--dsw-alias-label-tertiary,var(--ws-label-2));font-size:12px;line-height:1.6;text-align:center;padding:24px 8px}
.ws-msg{max-width:88%;padding:8px 10px;border-radius:12px;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;animation:ws-pop var(--ws-dur-base) var(--ws-ease-out)}
.ws-msg.user{align-self:flex-end;background:var(--dsw-alias-brand-primary,var(--ws-accent));color:var(--dsw-alias-label-primary-inverse,#fff);border-bottom-right-radius:4px}
.ws-msg.ai{align-self:flex-start;background:var(--dsw-alias-bg-layer-1,var(--ws-bg));border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));border-bottom-left-radius:4px}
.ws-msgRole{font-size:10px;opacity:.72;margin-bottom:2px}
.ws-chatFoot{flex:none;border-top:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));padding:10px;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-0,var(--ws-bg-2))}
.ws-chatInputRow{display:flex;gap:6px}
.ws-chatInput{flex:1;min-width:0;background:var(--dsw-alias-bg-layer-1,var(--ws-bg));color:var(--dsw-alias-label-primary,var(--ws-label));border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));border-radius:var(--ws-r-sm);padding:6px 10px;font-size:12px}
.ws-chatInput:focus{outline:2px solid var(--ws-accent);outline-offset:1px}
.ws-chatActions{display:flex;gap:6px}
.ws-agents{flex:none;max-height:240px;overflow:auto;border-top:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));padding:10px;display:flex;flex-direction:column;gap:6px;background:var(--dsw-alias-bg-layer-0,var(--ws-bg-2))}
.ws-agentsHead{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
.ws-agentRow{display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 8px;border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));border-radius:8px;background:var(--dsw-alias-bg-layer-1,var(--ws-bg))}
.ws-agentName{font-weight:600;flex:none}
.ws-agentRole{color:var(--dsw-alias-label-secondary,var(--ws-label-2));flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ws-agentCustom{font-size:9px;color:var(--ws-accent);border:1px solid color-mix(in srgb,var(--ws-accent) 45%,transparent);border-radius:99px;padding:0 5px;flex:none}
.ws-agentDel{border:none;background:transparent;color:var(--dsw-alias-label-secondary,var(--ws-label-2));cursor:pointer;font-size:13px;line-height:1;padding:2px 4px;border-radius:50%}
.ws-agentDel:hover{color:var(--ws-danger)}
/* == right: canvas + palette == */
.ws-canvas{flex:1;min-width:0;position:relative}
.ws-palette{position:absolute;top:12px;left:12px;z-index:5;width:152px;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:var(--ws-r-md);border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));background:var(--ws-glass-bg);backdrop-filter:blur(var(--ws-glass-blur)) saturate(var(--ws-glass-saturate));box-shadow:var(--ws-shadow-card)}
.ws-palette h5{margin:0 0 2px;font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2));text-transform:uppercase;letter-spacing:.04em}
.ws-palItem{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));border-radius:var(--ws-r-sm);background:var(--dsw-alias-bg-layer-1,var(--ws-bg));cursor:pointer;font-size:12px;text-align:left;transition:box-shadow var(--ws-dur-fast) var(--ws-ease-out),transform var(--ws-dur-fast) var(--ws-ease-out)}
.ws-palItem:hover{box-shadow:var(--ws-shadow-card);transform:translateY(-1px)}
.ws-palItem svg{flex:none}
.ws-canvasEmpty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:var(--dsw-alias-label-tertiary,var(--ws-label-2));font-size:12px;text-align:center;padding:24px;z-index:1}
.ws-runError{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);z-index:6;font-size:12px;color:var(--dsw-alias-label-primary-inverse,#fff);background:var(--ws-danger);border-radius:99px;padding:6px 14px;box-shadow:var(--ws-shadow-card);max-width:70%}
/* == nodes == */
.ws-node{position:relative;display:flex;flex-direction:column;gap:4px;padding:8px 12px;border-radius:var(--ws-r-md);border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));background:var(--dsw-alias-bg-overlay,var(--ws-bg));box-shadow:var(--ws-shadow-card);font-size:12px;min-width:180px;max-width:250px;transition:transform var(--ws-dur-fast) var(--ws-ease-out),box-shadow var(--ws-dur-fast) var(--ws-ease-out)}
.ws-node:hover{box-shadow:var(--ws-shadow-float)}
.ws-node.sel{outline:2px solid var(--ws-accent);outline-offset:1px}
.ws-nodeHead{display:flex;align-items:center;gap:6px;font-weight:600;padding-right:14px}
.ws-nodeTitle{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ws-nodeSub{color:var(--dsw-alias-label-secondary,var(--ws-label-2));font-size:11px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ws-kindTag{font-size:9px;padding:1px 6px;border-radius:99px;border:1px solid currentColor;opacity:.85;flex:none;line-height:1.5}
.ws-nodeDel{position:absolute;top:-8px;right:-8px;width:18px;height:18px;border-radius:50%;border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));background:var(--dsw-alias-bg-overlay,var(--ws-bg));color:var(--dsw-alias-label-secondary,var(--ws-label-2));cursor:pointer;font-size:13px;line-height:1;display:none;align-items:center;justify-content:center;z-index:2}
.ws-node:hover .ws-nodeDel,.ws-node.sel .ws-nodeDel{display:flex}
.ws-nodeDel:hover{color:var(--ws-danger);border-color:var(--ws-danger)}
.ws-loopMeta{display:flex;flex-wrap:wrap;gap:6px;font-size:10px;color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
.ws-flagged{font-size:10px;color:var(--ws-danger);border:1px solid rgba(255,59,48,.5);border-radius:99px;padding:0 6px}
.ws-handle{width:10px;height:10px;background:var(--ws-accent);border:2px solid var(--dsw-alias-bg-overlay,var(--ws-bg));border-radius:50%}
.ws-handle:hover{background:var(--ws-accent-dark,#0A84FF)}
/* == file bubbles + branch output == */
.ws-files{display:flex;flex-direction:column;gap:3px;margin-top:2px}
.ws-fileRow{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2));cursor:pointer;padding:3px 6px;border-radius:6px;transition:background var(--ws-dur-fast) var(--ws-ease-out)}
.ws-fileRow:hover{background:var(--dsw-alias-interactive-bg-hover,var(--ws-bg-2));color:var(--ws-accent)}
.ws-fileRow svg{flex:none}
.ws-fileBtn{font-size:10px;color:var(--ws-accent);border:1px dashed var(--dsw-alias-border-l2,var(--ws-bg-3));border-radius:6px;padding:2px 8px;background:transparent;cursor:pointer;transition:transform var(--ws-dur-fast) var(--ws-ease-out);align-self:flex-start}
.ws-fileBtn:hover{transform:scale(1.03)}
.ws-outRow{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-state-success,var(--ws-success));border:1px dashed color-mix(in srgb,var(--dsw-alias-state-success,var(--ws-success)) 55%,transparent);border-radius:6px;padding:3px 6px;cursor:pointer;margin-top:2px}
.ws-outName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px}
/* == review == */
.ws-reviewList{display:flex;flex-direction:column;gap:4px;margin-top:2px;max-height:120px;overflow:auto}
.ws-reviewItem{display:flex;align-items:flex-start;gap:6px;font-size:11px;padding:3px 6px;border-radius:6px;background:var(--dsw-alias-bg-layer-1,var(--ws-bg-2))}
.ws-reviewItem .ws-dim{font-weight:600;color:var(--dsw-alias-label-primary,var(--ws-label));flex:none}
.ws-reviewItem .ws-issue{color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
.ws-reviewItem.pass{border-left:2px solid var(--ws-success)}
.ws-reviewItem.fail{border-left:2px solid var(--ws-danger)}
/* == runtime visualization + bubbles + rollback == */
@keyframes ws-breath{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.18);opacity:.95}}
.ws-ring{position:absolute;inset:-7px;border-radius:var(--ws-r-lg);border:2px solid var(--ws-danger);pointer-events:none;animation:ws-breath 1.4s ease-in-out infinite}
.ws-bubble{margin-top:6px;padding:6px 8px;border-radius:var(--ws-r-sm);background:var(--dsw-alias-bg-layer-2,var(--ws-bg-2));border:1px solid var(--dsw-alias-border-l1,var(--ws-bg-3));font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2));max-width:220px;word-break:break-word}
.ws-bubble .ws-sum{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ws-bubble .ws-detail{display:none}
.ws-bubble:hover .ws-detail{display:block;color:var(--dsw-alias-label-primary,var(--ws-label));white-space:pre-wrap}
.ws-bubble.pending{color:var(--dsw-alias-label-tertiary,var(--ws-label-2));font-style:italic}
.ws-node.bubble-float .ws-bubble{display:none}
.ws-node.bubble-float:hover .ws-bubble{display:block;position:absolute;top:100%;left:0;z-index:6;box-shadow:var(--ws-shadow-card)}
.ws-rollback{font-size:10px;color:var(--ws-warning);border:1px solid rgba(255,149,0,.5);border-radius:6px;padding:1px 7px;background:transparent;cursor:pointer;margin-top:4px;align-self:flex-start}
.ws-rollback:hover{background:rgba(255,149,0,.12)}
.ws-modeSel{font-size:10px;border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));border-radius:6px;padding:1px 4px;background:var(--dsw-alias-bg-layer-1,var(--ws-bg));color:var(--dsw-alias-label-secondary,var(--ws-label-2));max-width:64px}
.ws-agentSel{max-width:110px}
.ws-status{font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
@keyframes ws-edge-flow{to{stroke-dashoffset:-24}}
.ws-edgeFlow{stroke-dasharray:6 6;animation:ws-edge-flow 1s linear infinite}
.ws-edgeActive path{stroke:var(--ws-danger)!important;stroke-dasharray:6 6;animation:ws-edge-flow 1s linear infinite}
.react-flow__edge-text{font-size:10px;font-weight:600;fill:var(--dsw-alias-label-primary,var(--ws-label))}
.react-flow__edge-textbg{fill:var(--dsw-alias-bg-overlay,var(--ws-bg));stroke:var(--dsw-alias-border-l2,var(--ws-bg-3));stroke-width:1}
.ws-runbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ws-simBadge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--dsw-alias-state-warning,var(--ws-warning));border:1px solid color-mix(in srgb,var(--dsw-alias-state-warning,var(--ws-warning)) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warning,var(--ws-warning)) 14%,transparent);border-radius:99px;padding:2px 10px}
/* == overlays == */
.ws-overlay{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center}
.ws-card{width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;border-radius:var(--ws-r-lg);background:var(--dsw-alias-bg-overlay,var(--ws-bg));color:var(--dsw-alias-label-primary,var(--ws-label));box-shadow:var(--ws-shadow-float);padding:16px;display:flex;flex-direction:column;gap:10px;animation:ws-pop var(--ws-dur-slow) var(--ws-ease-over)}
@keyframes ws-pop{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
.ws-card h4{margin:0;font-size:14px}
.ws-field{display:flex;flex-direction:column;gap:4px}
.ws-field label{font-size:11px;color:var(--dsw-alias-label-secondary,var(--ws-label-2))}
.ws-input{width:100%;box-sizing:border-box;background:var(--dsw-alias-bg-layer-1,var(--ws-bg));color:var(--dsw-alias-label-primary,var(--ws-label));border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));border-radius:var(--ws-r-sm);padding:6px 10px;font-size:12px;font-family:inherit}
.ws-input:focus{outline:2px solid var(--ws-accent);outline-offset:1px}
.ws-card textarea.ws-input{resize:vertical;min-height:56px}
.ws-row{display:flex;gap:8px}
.ws-row .ws-field{flex:1}
.ws-err{font-size:11px;color:var(--ws-danger)}
.ws-footRow{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.ws-delBtn{color:var(--ws-danger);border-color:rgba(255,59,48,.45)}
.ws-delBtn:hover{background:rgba(255,59,48,.1)}
.ws-runSel{font-size:12px;background:var(--dsw-alias-bg-layer-1,var(--ws-bg));color:var(--dsw-alias-label-primary,var(--ws-label));border:1px solid var(--dsw-alias-border-l2,var(--ws-bg-3));border-radius:var(--ws-r-sm);padding:4px 6px}
.ws-btn:focus-visible,.ws-palItem:focus-visible,.ws-chatInput:focus-visible,.ws-input:focus-visible,.ws-modeSel:focus-visible,.ws-runSel:focus-visible,.ws-nodeDel:focus-visible,.ws-agentDel:focus-visible{outline:2px solid var(--ws-accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.ws-card{animation:none}.ws-msg{animation:none}.ws-btn,.ws-node,.ws-fileRow,.ws-fileBtn,.ws-reviewItem{transition:none}.ws-edgeFlow{animation:none}.ws-ring{animation:none}.ws-edgeActive path{animation:none}}
`;
		const tagId = "@eave_bounty/dsh-workflow-studio/styles";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@eave_bounty/dsh-workflow-studio";
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
			"sub": "树形工作流 · 分支并行",
			"loading": "加载中…",
			"save": "保存",
			"saved": "已保存",
			"export": "导出",
			"import": "导入",
			"confirm": "确认",
			"cancel": "取消",
			"rf.fail": "React Flow 注入失败（离线）",
			"chat.title": "流程创建对话",
			"chat.placeholder": "用自然语言描述你想构建的工作流…",
			"chat.generate": "生成工作流",
			"chat.grow": "追加节点",
			"chat.clear": "清空对话",
			"chat.empty": "输入需求并点击「生成工作流」；AI 会以根节点为起点生成一棵可编辑的树，之后可在画布上增删改连。",
			"chat.user": "我",
			"chat.assistant": "流程创建器",
			"chat.generated": "已生成树形工作流：{n} 个节点，{m} 条连线。可在画布上继续编辑，或直接运行。",
			"chat.appended": "已追加节点「{title}」。",
			"chat.failed": "生成失败，请重试。",
			"canvas.empty": "画布为空 —— 在左侧对话中描述需求生成，或从面板手动添加节点。",
			"palette": "节点面板",
			"pal.root": "起点",
			"pal.plan": "计划",
			"pal.action": "执行",
			"pal.review": "审核",
			"pal.summary": "总结",
			"pal.dimension": "维度",
			"pal.loop": "循环",
			"node.editTitle": "节点设置",
			"node.agent": "代理",
			"node.delete": "删除该节点？",
			"node.prompt": "提示词",
			"node.outNone": "无输出",
			"node.outFile": "文件输出",
			"node.outText": "文本输出",
			"node.outPath": "输出文件路径",
			"node.outTextLabel": "输出文本",
			"node.loopMode": "启用循环（评分闸门）",
			"node.threshold": "放行阈值",
			"node.maxAttempts": "最大尝试次数",
			"file.attach": "添加文件",
			"file.bubble": "产出文件",
			"edge.title": "连线语义",
			"edge.intent": "意图",
			"edge.label": "标签",
			"edge.threshold": "放行阈值",
			"edge.delete": "删除该连线？",
			"edge.ctx": "注入上下文",
			"edge.artifact": "传递产出",
			"edge.promptInject": "注入提示词",
			"edge.output": "分支输出",
			"edge.reviewFeedback": "检查反馈",
			"edge.loopGate": "Loop 评分闸门",
			"edge.custom": "自定义",
			"run": "运行",
			"run.running": "运行中…",
			"run.sim": "仿真模式（原生引擎未启用）",
			"run.simOffline": "仿真模式（离线）",
			"run.agents": "已启动 {n} 个子代理",
			"run.stop": "停止原因：{r}",
			"run.empty": "画布为空，请先生成或添加节点",
			"run.error": "运行失败",
			"runtime.pending": "执行中…",
			"runtime.doneNone": "（待概括）",
			"runtime.flagged": "未达标",
			"rollback": "回退",
			"loop.score": "评分",
			"loop.threshold": "阈值",
			"loop.attempts": "最多",
			"review.add": "添加意见",
			"review.addPrompt": "输入审核意见：维度 / 问题（用 / 分隔）",
			"review.dim": "综合审核",
			"agents.title": "代理注册表",
			"agents.add": "添加代理",
			"agents.id": "代理 ID",
			"agents.name": "名称",
			"agents.role": "角色",
			"agents.prompt": "提示词",
			"agents.dup": "ID 已存在",
			"agents.custom": "自定义",
			"set.bubbleLabel": "节点气泡显示模式",
			"set.bubbleDefault": "常显（默认）",
			"set.bubbleFloat": "悬浮",
			"mode.normal": "普通",
			"mode.loop": "Loop",
			"sim.sum.file": "「{title}」产出文件：{path}。",
			"sim.sum.plan": "「{title}」已完成：产出可分步执行的计划与分工。",
			"sim.sum.action": "「{title}」已完成：执行并产出可用结果。",
			"sim.sum.summary": "「{title}」已完成：汇总上游产出形成结构化分析。",
			"sim.sum.review": "「{title}」审核完成：评分 {score}，{issues}。",
			"sim.sum.dimension": "「{title}」完成单维度审核。",
			"sim.sum.loop": "「{title}」循环完成（评分 {score}）。",
			"sim.sum.root": "「{title}」启动流程。",
			"sim.sum.default": "「{title}」已完成。",
			"sim.dim": "综合审核",
			"sim.issue.pass": "通过",
			"node.title": "节点标题",
			"node.deleteBtn": "删除节点",
			"agents.delete": "移除代理",
			"chat.keys.line": "\\d+[.、)．]|[-*•]\\s*|\\(\\d+\\)",
			"chat.keys.sentence": "[。；;\\n]+",
			"chat.keys.clause": "[，,、]+",
			"chat.keys.sep": "[/|｜]",
			"chat.keys.review": "审核|检查|评审|review|test|测试",
			"chat.keys.loop": "循环|迭代|loop|iterate|直到|反复",
			"chat.keys.summary": "总结|汇总|分析|summary|报告|report",
			"chat.keys.plan": "计划|规划|拆解|plan",
			"chat.keys.dimension": "维度|角度|dimension|视角",
			"agent.research.name": "调研员",
			"agent.research.prompt": "你是资深调研员：第一性原理拆解目标，输出事实清单与资料来源。",
			"agent.analyst.name": "分析师",
			"agent.analyst.prompt": "你是分析师：汇总上游产出，提炼结构化结论与风险。",
			"agent.planner.name": "产品经理",
			"agent.planner.prompt": "你是产品经理：将目标拆解为可分步执行、可分工的计划。",
			"agent.executor.name": "执行者",
			"agent.executor.prompt": "你是执行者：按输入产出可用结果与文件。",
			"agent.reviewer.name": "审核员",
			"agent.reviewer.prompt": "你是多维度审核员：从功能完整性、正确性、风险等角度检查并反馈。"
		};
		const en = {
			"view.workflow": "Workflow",
			"title": "Workflow Studio",
			"sub": "Tree workflow · parallel branches",
			"loading": "Loading…",
			"save": "Save",
			"saved": "Saved",
			"export": "Export",
			"import": "Import",
			"confirm": "Confirm",
			"cancel": "Cancel",
			"rf.fail": "React Flow failed to load (offline)",
			"chat.title": "Workflow builder chat",
			"chat.placeholder": "Describe the workflow you want in natural language…",
			"chat.generate": "Generate workflow",
			"chat.grow": "Add node",
			"chat.clear": "Clear chat",
			"chat.empty": "Describe a request and hit “Generate workflow”; the builder grows an editable tree from a root node that you can then edit on the canvas.",
			"chat.user": "You",
			"chat.assistant": "Workflow builder",
			"chat.generated": "Tree workflow generated: {n} nodes, {m} edges. Edit it on the canvas or run it directly.",
			"chat.appended": "Node “{title}” appended.",
			"chat.failed": "Generation failed, please retry.",
			"canvas.empty": "Canvas empty — describe a request in the chat to generate, or add nodes from the palette.",
			"palette": "Nodes",
			"pal.root": "Root",
			"pal.plan": "Plan",
			"pal.action": "Action",
			"pal.review": "Review",
			"pal.summary": "Summary",
			"pal.dimension": "Dimension",
			"pal.loop": "Loop",
			"node.editTitle": "Node settings",
			"node.agent": "Agent",
			"node.delete": "Delete this node?",
			"node.prompt": "Prompt",
			"node.outNone": "No output",
			"node.outFile": "File output",
			"node.outText": "Text output",
			"node.outPath": "Output file path",
			"node.outTextLabel": "Output text",
			"node.loopMode": "Enable loop (score gate)",
			"node.threshold": "Pass threshold",
			"node.maxAttempts": "Max attempts",
			"file.attach": "Attach file",
			"file.bubble": "Output file",
			"edge.title": "Edge intent",
			"edge.intent": "Intent",
			"edge.label": "Label",
			"edge.threshold": "Pass threshold",
			"edge.delete": "Delete this edge?",
			"edge.ctx": "Inject context",
			"edge.artifact": "Pass artifact",
			"edge.promptInject": "Inject prompt",
			"edge.output": "Branch output",
			"edge.reviewFeedback": "Review feedback",
			"edge.loopGate": "Loop score gate",
			"edge.custom": "Custom",
			"run": "Run",
			"run.running": "Running…",
			"run.sim": "Simulation mode (native engine not enabled)",
			"run.simOffline": "Simulation mode (offline)",
			"run.agents": "{n} subagents started",
			"run.stop": "Stop reason: {r}",
			"run.empty": "Canvas is empty — generate or add nodes first",
			"run.error": "Run failed",
			"runtime.pending": "Running…",
			"runtime.doneNone": "(no summary yet)",
			"runtime.flagged": "Not passed",
			"rollback": "Roll back",
			"loop.score": "Score",
			"loop.threshold": "Threshold",
			"loop.attempts": "Max",
			"review.add": "Add finding",
			"review.addPrompt": "Enter a review finding: dimension / issue (separate with /)",
			"review.dim": "Overall review",
			"agents.title": "Agent registry",
			"agents.add": "Add agent",
			"agents.id": "Agent ID",
			"agents.name": "Name",
			"agents.role": "Role",
			"agents.prompt": "Prompt",
			"agents.dup": "ID already exists",
			"agents.custom": "Custom",
			"set.bubbleLabel": "Node bubble display mode",
			"set.bubbleDefault": "Always shown (default)",
			"set.bubbleFloat": "Floating on hover",
			"mode.normal": "Normal",
			"mode.loop": "Loop",
			"sim.sum.file": "{title} produced file: {path}.",
			"sim.sum.plan": "{title} done: produced a step-by-step plan with roles.",
			"sim.sum.action": "{title} done: executed and produced usable results.",
			"sim.sum.summary": "{title} done: aggregated upstream outputs into structured analysis.",
			"sim.sum.review": "{title} review done: score {score}, {issues}.",
			"sim.sum.dimension": "{title} finished single-dimension review.",
			"sim.sum.loop": "{title} loop finished (score {score}).",
			"sim.sum.root": "{title} started the flow.",
			"sim.sum.default": "{title} done.",
			"sim.dim": "Overall review",
			"sim.issue.pass": "Pass",
			"node.title": "Title",
			"node.deleteBtn": "Delete node",
			"agents.delete": "Remove agent",
			"chat.keys.line": "\\d+[.)]|[-*]\\s*|\\(\\d+\\)",
			"chat.keys.sentence": "[;.\\n]+",
			"chat.keys.clause": "[,]+",
			"chat.keys.sep": "[/|]",
			"chat.keys.review": "review|check|audit|test",
			"chat.keys.loop": "loop|iterate|until|repeat",
			"chat.keys.summary": "summary|aggregate|analy|report",
			"chat.keys.plan": "plan|planning|breakdown|steps",
			"chat.keys.dimension": "dimension|angle|perspective",
			"agent.research.name": "Researcher",
			"agent.research.prompt": "You are a senior researcher: break the goal down from first principles and output facts with sources.",
			"agent.analyst.name": "Analyst",
			"agent.analyst.prompt": "You are an analyst: aggregate upstream outputs and distill structured conclusions and risks.",
			"agent.planner.name": "Product manager",
			"agent.planner.prompt": "You are a product manager: break the goal into a step-by-step, distributable plan.",
			"agent.executor.name": "Executor",
			"agent.executor.prompt": "You are an executor: turn inputs into usable results and files.",
			"agent.reviewer.name": "Reviewer",
			"agent.reviewer.prompt": "You are a multi-dimension reviewer: check and give feedback on completeness, correctness, and risk."
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
		// @xyflow/react UMD does NOT embed its CSS — dist/style.css is mandatory and must be
		// injected separately or the canvas renders unstyled.
		function ensureRuntime(onReady) {
			const load = async () => {
				if (window.ReactFlow && window.gsap) { injectRfStyle(); onReady(); return; }
				try {
					if (!window.ReactFlow) {
						await injectScript("https://cdn.jsdelivr.net/npm/@xyflow/react@12.11.3/dist/umd/index.js");
						injectRfStyle();
					}
					if (!window.gsap) await injectScript("https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js");
				} catch (e) { /* offline — will stay degraded */ }
				onReady();
			};
			load();
		}
		// Inject the mandatory React Flow stylesheet once (idempotent).
		function injectRfStyle() {
			if (typeof document === "undefined" || document.querySelector('link[data-rf-style]')) return;
			const lnk = document.createElement("link");
			lnk.rel = "stylesheet";
			lnk.href = "https://cdn.jsdelivr.net/npm/@xyflow/react@12.11.3/dist/style.css";
			lnk.dataset.rfStyle = "1";
			document.head.appendChild(lnk);
		}
		// Derive dark mode from the host theme (respects prefers-color-scheme + DSH).
		function isDarkMode() {
			if (typeof window === "undefined") return false;
			return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		//#endregion

		//#region constants (mirror lib/tree.js so the client stays self-contained)
		const NODE_KINDS = ["root", "plan", "action", "review", "summary", "dimension", "loop"];
		const EDGE_INTENTS = ["context", "artifact", "prompt-inject", "review-feedback", "loop-gate", "output", "custom"];
		const KIND_COLORS = {
			root: "#FF9500", plan: "#AF52DE", action: "#FF2D55", review: "#FFD60A",
			summary: "#34C759", dimension: "#5E5CE6", loop: "#64D2FF"
		};
		const DEFAULT_AGENT = {
			root: "agent.planner", plan: "agent.planner", action: "agent.executor",
			review: "agent.reviewer", summary: "agent.analyst", dimension: "agent.reviewer", loop: "agent.executor"
		};
		// Local copy of the preset registry (authoritative list fetched from GET /agents).
		// Names/prompts come from the locale dicts so no display text is hardcoded here.
		const presetAgentsFromT = (t) => ({
			"agent.research": { id: "agent.research", name: t("agent.research.name"), role: "research", prompt: t("agent.research.prompt") },
			"agent.analyst": { id: "agent.analyst", name: t("agent.analyst.name"), role: "summary", prompt: t("agent.analyst.prompt") },
			"agent.planner": { id: "agent.planner", name: t("agent.planner.name"), role: "plan", prompt: t("agent.planner.prompt") },
			"agent.executor": { id: "agent.executor", name: t("agent.executor.name"), role: "action", prompt: t("agent.executor.prompt") },
			"agent.reviewer": { id: "agent.reviewer", name: t("agent.reviewer.name"), role: "review", prompt: t("agent.reviewer.prompt") }
		});
		const uid = (p) => p + "-" + Date.now().toString(36) + "-" + ((Math.random() * 1e4) | 0).toString(36);
		const trunc = (s, n) => { const t = String(s == null ? "" : s).trim(); return t.length > n ? t.slice(0, n) + "…" : t; };
		// Convert a flat host tree {nodes,edges,agents,plan} into React Flow {nodes,edges}.
		const treeToRF = (tree, colors, dagents) => {
			const rfNodes = (tree.nodes || []).map((n) => {
				const data = {
					id: n.id, kind: n.kind || "action", title: n.title || n.id,
					agentId: n.agentId || "", prompt: n.prompt || "",
					files: n.files || [], review: n.review || [], loop: n.loop || {}, out: n.out || null, subGraph: n.subGraph || null,
					runtime: n.runtime || null, iconColor: colors[n.kind] || "#007AFF",
					actionMode: n.kind === "action" ? (n.loop?.mode === "loop" ? "loop" : "normal") : undefined
				};
				return { id: n.id, type: "workflow", position: n.pos || { x: 60 + Math.random() * 120, y: 60 }, data };
			});
			const rfEdges = (tree.edges || []).map((e, i) => ({
				id: e.id || uid("e"), source: e.source, target: e.target, type: "smoothstep",
				label: e.data?.detail || e.intent || "context", labelBgPadding: [4, 2], labelBgBorderRadius: 6, data: { intent: e.intent || "context", detail: e.data?.detail || "", ...(e.data || {}) }
			}));
			return { nodes: rfNodes, edges: rfEdges };
		};
		//#endregion

		//#region icons
		function diamondIcon(color) {
			return jsx("svg", { width: 14, height: 14, viewBox: "0 0 16 16", fill: color || "currentColor", children: jsx("path", { d: "M8 1l5 7-5 7-5-7z" }) });
		}
		function fileIcon() {
			return jsx("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", "stroke-width": 1.3, children: [
				jsx("path", { d: "M3 2.5h6l4 4V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" }),
				jsx("path", { d: "M9 2.5V6h3.5" })
			] });
		}
		//#endregion

		//#region heuristic helpers (tree building from natural language)
		// Parse free text into discrete steps: numbered/bulleted lines, sentences, clauses.
		// Separator/keyword patterns come from the locale dicts (chat.keys.*).
		function parseSteps(text, keys) {
			const steps = [];
			const raw = String(text || "").replace(/\r/g, "").trim();
			if (!raw) return steps;
			const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
			const linePattern = new RegExp("^(" + keys.line + ")", "i");
			for (const ln of lines) {
				const clean = ln.replace(linePattern, "").trim();
				if (clean && clean.length > 1) steps.push(clean);
			}
			if (steps.length >= 2) return steps;
			const sentences = raw.split(new RegExp(keys.sentence)).map((s) => s.trim()).filter((s) => s.length > 1);
			if (sentences.length >= 2) return sentences.slice(0, 8);
			const clauses = raw.split(new RegExp(keys.clause)).map((s) => s.trim()).filter((s) => s.length > 1);
			if (clauses.length >= 3) return clauses.slice(0, 8);
			return steps.length ? steps : [raw];
		}
		// Guess a node kind from the text (keyword heuristics via localized patterns).
		function guessKind(text, keys) {
			const s = String(text || "");
			if (new RegExp(keys.review, "i").test(s)) return "review";
			if (new RegExp(keys.loop, "i").test(s)) return "loop";
			if (new RegExp(keys.summary, "i").test(s)) return "summary";
			if (new RegExp(keys.plan, "i").test(s)) return "plan";
			if (new RegExp(keys.dimension, "i").test(s)) return "dimension";
			return "action";
		}
		// Topological stage grouping (mirror of tree.parallelStages) for the local simulation.
		function computeStages(ns, es) {
			const ids = ns.map((n) => n.id);
			const indeg = new Map(ids.map((id) => [id, 0]));
			const adj = new Map(ids.map((id) => [id, []]));
			for (const e of es || []) {
				if (!indeg.has(e.source) || !indeg.has(e.target)) continue;
				adj.get(e.source).push(e.target);
				indeg.set(e.target, indeg.get(e.target) + 1);
			}
			const stages = [];
			const done = new Set();
			let remaining = ids.length;
			while (remaining > 0) {
				let ready = ids.filter((id) => !done.has(id) && indeg.get(id) === 0);
				if (!ready.length) ready = ids.filter((id) => !done.has(id)); // cycle fallback
				if (!ready.length) break;
				stages.push(ready);
				for (const id of ready) {
					done.add(id);
					for (const nx of adj.get(id) || []) indeg.set(nx, indeg.get(nx) - 1);
				}
				remaining -= ready.length;
			}
			return stages;
		}
		//#endregion

		//#region module-level handlers + shared state
		// Module-level handlers keep callbacks OUT of serialized node.data (functions are
		// dropped by JSON.stringify), so persisted workflows round-trip cleanly.
		let attachHandler = null;
		let rollbackHandler = null;
		let actionModeHandler = null;
		let agentChangeHandler = null;
		let deleteNodeHandler = null;
		let reviewAddHandler = null;
		let viewT = (k) => k;
		let bubbleMode = "default"; // "default" | "float"
		let agentRegistry = {};     // agentId -> {id,name,role,prompt}
		let RFGlobal = null;        // window.ReactFlow (set once runtime is ready)
		// Shared plugin settings (in-memory; also surfaced in the Settings page).
		const pluginSettings = { bubbleMode: "default" };
		//#endregion

		//#region node component
		function WorkflowNode({ data, selected }) {
			const rt = data.runtime || { status: "idle", summary: "", detail: "", history: [] };
			const kind = data.kind || "action";
			const isLoop = kind === "loop" || (data.loop && data.loop.mode === "loop");
			const isReview = kind === "review" || kind === "dimension";
			const agent = agentRegistry[data.agentId];
			const reviewItems = isReview && Array.isArray(data.review) ? data.review : [];
			const outFile = data.out && data.out.type === "file";
			const bubbleCls = "ws-bubble" + (rt.status === "done" ? "" : " pending") + (bubbleMode === "float" ? " hidden" : "");
			const kindColor = data.iconColor || KIND_COLORS[kind] || "var(--ws-accent)";
			// Agent dropdown options: registry entries + a fallback entry so the select never shows blank.
			let agentOptions = Object.keys(agentRegistry).map((k) => agentRegistry[k]);
			if (data.agentId && !agentRegistry[data.agentId]) agentOptions = [{ id: data.agentId, name: data.agentId, role: "", prompt: "" }].concat(agentOptions);
			const RF = RFGlobal;
			const copyPath = (p) => { try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(String(p || "")); } catch (e) { /* clipboard unavailable */ } };
			return jsxs("div", { className: "ws-node" + (selected ? " sel" : "") + (bubbleMode === "float" ? " bubble-float" : " bubble-default"), children: [
				rt.status === "running" ? jsx("div", { className: "ws-ring" }) : null,
				RF ? jsx(RF.Handle, { type: "target", position: RF.Position.Top, className: "ws-handle" }) : null,
				jsxs("div", { className: "ws-nodeHead", children: [
					diamondIcon(kindColor),
					jsx("span", { className: "ws-nodeTitle", children: data.title || data.id }),
					rt.status === "done" ? jsx("span", { className: "ws-status", style: { color: "var(--ws-success)" }, children: "\u2713" }) : null,
					jsx("span", { className: "ws-kindTag", style: { color: kindColor, borderColor: kindColor }, children: viewT("pal." + kind) }),
					typeof deleteNodeHandler === "function" ? jsx("button", { type: "button", className: "ws-nodeDel", title: viewT("node.delete"), onClick: (e) => { e.stopPropagation(); deleteNodeHandler(data.id); }, children: "\u00d7" }) : null
				] }),
				jsx("div", { className: "ws-nodeSub", children: (agent ? agent.name : data.agentId) + (data.prompt ? " · " + data.prompt : "") }),
				jsxs("div", { className: "ws-row", children: [
					kind === "action" ? jsx("select", {
						className: "ws-modeSel", value: data.actionMode || "normal", title: viewT("mode.normal") + "/PTC/" + viewT("mode.loop"),
						onClick: (e) => e.stopPropagation(),
						onChange: (e) => { if (actionModeHandler) actionModeHandler(data.id, e.target.value); },
						children: [
							jsx("option", { value: "normal", children: viewT("mode.normal") }),
							jsx("option", { value: "ptc", children: "PTC" }),
							jsx("option", { value: "loop", children: viewT("mode.loop") })
						]
					}) : null,
					jsx("select", {
						className: "ws-modeSel ws-agentSel", value: data.agentId || "", title: viewT("node.agent"),
						onClick: (e) => e.stopPropagation(),
						onChange: (e) => { if (agentChangeHandler) agentChangeHandler(data.id, e.target.value); },
						children: agentOptions.map((a) => jsx("option", { value: a.id, key: a.id, children: a.name + (a.role ? " (" + a.role + ")" : "") }))
					})
				] }),
				isLoop ? jsxs("div", { className: "ws-loopMeta", children: [
					jsx("span", { children: viewT("loop.threshold") + " " + (data.loop && data.loop.threshold != null ? data.loop.threshold : "0.7") }),
					jsx("span", { children: viewT("loop.attempts") + " " + (data.loop && data.loop.maxAttempts != null ? data.loop.maxAttempts : "3") }),
					rt.score != null ? jsx("span", { style: { color: "var(--ws-accent)" }, children: viewT("loop.score") + " " + (typeof rt.score === "number" ? rt.score.toFixed(2) : rt.score) }) : null,
					rt.flagged ? jsx("span", { className: "ws-flagged", children: viewT("runtime.flagged") }) : null
				] }) : null,
				reviewItems.length ? jsxs("div", { className: "ws-reviewList", children: reviewItems.map((r, i) => jsxs("div", {
					className: "ws-reviewItem" + (r.pass ? " pass" : " fail"), key: i,
					children: [jsx("span", { className: "ws-dim", children: r.dimension }), jsx("span", { className: "ws-issue", children: r.issue })]
				})) }) : null,
				isReview && typeof reviewAddHandler === "function" ? jsx("button", { type: "button", className: "ws-fileBtn", onClick: (e) => { e.stopPropagation(); reviewAddHandler(data.id); }, children: viewT("review.add") }) : null,
				Array.isArray(data.files) && data.files.length ? jsxs("div", { className: "ws-files", children: data.files.map((f) => jsx("div", {
					className: "ws-fileRow", key: f.id, title: f.summary || f.path || f.name,
					onClick: (e) => { e.stopPropagation(); copyPath(f.path || f.name); },
					children: [fileIcon(), jsx("span", { children: f.name })]
				})) }) : null,
				outFile ? jsx("div", { className: "ws-outRow", title: data.out.path || data.out.text || "", onClick: (e) => { e.stopPropagation(); copyPath(data.out.path || ""); }, children: [fileIcon(), jsx("span", { className: "ws-outName", children: data.out.path || viewT("file.bubble") })] }) : null,
				typeof attachHandler === "function" ? jsx("button", { type: "button", className: "ws-fileBtn", onClick: (e) => { e.stopPropagation(); attachHandler(data.id); }, children: viewT("file.attach") }) : null,
				rt.status === "done" ? jsxs("div", { className: bubbleCls, children: [
					jsx("div", { className: "ws-sum", children: rt.summary || viewT("runtime.doneNone") }),
					rt.detail ? jsx("div", { className: "ws-detail", children: rt.detail }) : null
				] }) : (rt.status === "running" ? jsx("div", { className: bubbleCls + " pending", children: viewT("runtime.pending") }) : null),
				rt.status === "done" && typeof rollbackHandler === "function" && rt.history && rt.history.length ? jsx("button", { type: "button", className: "ws-rollback", onClick: (e) => { e.stopPropagation(); rollbackHandler(data.id); }, children: viewT("rollback") }) : null,
				RF ? jsx(RF.Handle, { type: "source", position: RF.Position.Bottom, className: "ws-handle" }) : null
			] });
		}
		//#endregion

		//#region WorkflowView
		function WorkflowView({ t, sessionId }) {
			const [ready, setReady] = react.useState(false);
			const [nodes, setNodes] = react.useState([]);
			const [edges, setEdges] = react.useState([]);
			const [plan, setPlan] = react.useState("");
			const [overlay, setOverlay] = react.useState(null); // {type:'node'|'edge'|'agent', ...}
			const [saved, setSaved] = react.useState(false);
			const [chat, setChat] = react.useState([]);
			const [chatText, setChatText] = react.useState("");
			const [agentsOpen, setAgentsOpen] = react.useState(false);
			const [customAgents, setCustomAgents] = react.useState([]);
			const [presetAgents, setPresetAgents] = react.useState(() => presetAgentsFromT(t));
			const [bubbleModeState, setBubbleModeState] = react.useState(pluginSettings.bubbleMode || "default");
			const [runId, setRunId] = react.useState(1);
			const [running, setRunning] = react.useState(false);
			const [simMode, setSimMode] = react.useState("none"); // none | engine | offline
			const [runInfo, setRunInfo] = react.useState(null);   // {agents?, reason?, error?}
			const pendingAnimateRef = react.useRef(new Set());
			const fileInputRef = react.useRef(null);
			const edgesRef = react.useRef(edges);
			react.useEffect(() => { edgesRef.current = edges; }, [edges]);

			const fmt = (key, vars) => {
				let s = t(key);
				if (vars) for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k] == null ? "" : vars[k]));
				return s;
			};

			// Localized heuristic patterns (separators + kind keywords) for chat generation.
			const kindKeys = {
				line: t("chat.keys.line"), sentence: t("chat.keys.sentence"), clause: t("chat.keys.clause"), sep: t("chat.keys.sep"),
				review: t("chat.keys.review"), loop: t("chat.keys.loop"), summary: t("chat.keys.summary"), plan: t("chat.keys.plan"), dimension: t("chat.keys.dimension")
			};

			react.useEffect(() => {
				ensureRuntime(() => { RFGlobal = window.ReactFlow || null; setReady(true); });
			}, []);

			// Authoritative preset registry (fallback: local copy).
			react.useEffect(() => {
				fetch("/api/dsh-workflow-studio/agents").then((r) => r.json()).then((d) => {
					if (d && d.ok && Array.isArray(d.agents)) {
						const map = {};
						d.agents.forEach((a) => { if (a && a.id) map[a.id] = { id: a.id, name: a.name, role: a.role, prompt: a.prompt }; });
						if (Object.keys(map).length) setPresetAgents(map);
					}
				}).catch(() => { /* offline — local copy */ });
			}, []);

			// Restore the last full-fidelity snapshot (server normalizeWorkflow strips fields,
			// so localStorage is the source of truth across reloads).
			react.useEffect(() => {
				try {
					const raw = window.localStorage.getItem("dsh-workflow-studio.tree.v2");
					if (raw) {
						const data = JSON.parse(raw);
						if (Array.isArray(data.nodes)) { setNodes(data.nodes); setEdges(data.edges || []); }
						if (typeof data.plan === "string") setPlan(data.plan);
						if (Array.isArray(data.customAgents)) setCustomAgents(data.customAgents);
					}
				} catch (e) { /* invalid snapshot */ }
			}, []);
			react.useEffect(() => {
				try { window.localStorage.setItem("dsh-workflow-studio.tree.v2", JSON.stringify({ nodes, edges, plan, customAgents })); } catch (e) { /* quota */ }
			}, [nodes, edges, plan, customAgents]);

			const buildAgentRegistry = () => {
				const m = { ...presetAgents };
				customAgents.forEach((a) => { if (a && a.id) m[a.id] = a; });
				return m;
			};
			// Module-scope mirror so WorkflowNode can read the registry without prop drilling.
			agentRegistry = buildAgentRegistry();
			viewT = t;

			// Keep module-level handlers in sync with this view instance.
			react.useEffect(() => {
				attachHandler = attachFile;
				rollbackHandler = rollbackNode;
				actionModeHandler = setActionMode;
				agentChangeHandler = setNodeAgent;
				deleteNodeHandler = deleteNode;
				reviewAddHandler = addReviewItem;
			}, [nodes, edges, plan, customAgents, presetAgents, bubbleModeState, t]);

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

			const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

			// ---- node data mutations ----
			const setNodeRuntime = (id, patch) => {
				setNodes((prev) => prev.map((n) => {
					if (n.id !== id) return n;
					const rt = { status: "idle", summary: "", detail: "", history: [], ...(n.data.runtime || {}), ...patch };
					if (patch.status === "done") rt.history = [...(rt.history || []), { runId: rt.runId, status: "done", summary: rt.summary, detail: rt.detail, at: Date.now() }];
					return { ...n, data: { ...n.data, runtime: rt } };
				}));
			};

			const attachFile = (nodeId) => {
				const name = window.prompt(t("file.attach"));
				if (!name) return;
				setNodes((prev) => prev.map((n) => {
					if (n.id !== nodeId) return n;
					const files = Array.isArray(n.data.files) ? n.data.files : [];
					return { ...n, data: { ...n.data, files: [...files, { id: "f-" + Date.now(), name, path: name, kind: "doc" }] } };
				}));
			};

			const addReviewItem = (nodeId) => {
				const raw = window.prompt(t("review.addPrompt"));
				if (!raw) return;
				const parts = raw.split(new RegExp(kindKeys.sep));
				const dim = (parts[0] || "").trim() || t("review.dim");
				const issue = (parts[1] || "").trim() || "";
				setNodes((prev) => prev.map((n) => n.id === nodeId
					? { ...n, data: { ...n.data, review: [...(Array.isArray(n.data.review) ? n.data.review : []), { dimension: dim, issue: issue, pass: false }] } }
					: n));
			};

			const deleteNode = (id) => {
				if (!window.confirm(t("node.delete"))) return;
				setNodes((prev) => prev.filter((n) => n.id !== id));
				setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
			};

			const setActionMode = (id, mode) => {
				setNodes((prev) => prev.map((n) => n.id === id
					? { ...n, data: {
						...n.data,
						actionMode: mode,
						loop: mode === "loop"
							? { mode: "loop", threshold: (n.data.loop && n.data.loop.threshold) || 0.7, maxAttempts: (n.data.loop && n.data.loop.maxAttempts) || 3 }
							: { ...(n.data.loop || {}), mode: undefined }
					} }
					: n));
			};

			const setNodeAgent = (id, agentId) => {
				setNodes((prev) => prev.map((n) => n.id === id ? { ...n, data: { ...n.data, agentId } } : n));
			};

			const rollbackNode = (id) => {
				const rt = nodes.find((n) => n.id === id)?.data?.runtime;
				if (!rt || !rt.history || !rt.history.length) return;
				setNodes((prev) => {
					const nextRt = { ...rt, pointer: Math.max(0, (rt.pointer ?? rt.history.length) - 1) };
					const patch = new Map();
					patch.set(id, { ...nextRt, status: "idle", summary: "", detail: "" });
					const stack = [id];
					while (stack.length) {
						const cur = stack.pop();
						for (const e of edgesRef.current) {
							if (e.source !== cur) continue;
							if (!patch.has(e.target)) { patch.set(e.target, { status: "idle", summary: "", detail: "", history: [], pointer: 0 }); stack.push(e.target); }
						}
					}
					return prev.map((n) => patch.has(n.id) ? { ...n, data: { ...n.data, runtime: patch.get(n.id) } } : n);
				});
			};

			// ---- tree building (client → host payload) ----
			const buildTree = () => {
				const treeNodes = nodes.map((n) => ({
					id: n.id,
					kind: n.data.kind || "action",
					title: n.data.title || n.id,
					agentId: n.data.agentId || DEFAULT_AGENT[n.data.kind] || "agent.executor",
					prompt: typeof n.data.prompt === "string" ? n.data.prompt : "",
					files: Array.isArray(n.data.files) ? n.data.files : [],
					review: Array.isArray(n.data.review) ? n.data.review : [],
					loop: n.data.loop || {},
					out: n.data.out || null,
					subGraph: n.data.subGraph || null,
					pos: n.position || { x: 60, y: 60 }
				}));
				const treeEdges = edges.map((e) => ({
					id: e.id,
					source: e.source,
					target: e.target,
					intent: (e.data && e.data.intent) || "custom",
					data: e.data || {}
				}));
				const agents = { ...presetAgents };
				customAgents.forEach((a) => { if (a && a.id) agents[a.id] = a; });
				return { id: "tree-1", name: t("title"), nodes: treeNodes, edges: treeEdges, agents, plan, status: "draft" };
			};

			const intentLabel = (intent) => {
				const m = { context: t("edge.ctx"), artifact: t("edge.artifact"), "prompt-inject": t("edge.promptInject"), "review-feedback": t("edge.reviewFeedback"), "loop-gate": t("edge.loopGate"), output: t("edge.output"), custom: t("edge.custom") };
				return m[intent] || t("edge.custom");
			};

			// ---- run ----
			const applyResults = (value, rid) => {
				const results = (value && value.results) || {};
				const outputs = (value && value.outputs) || {};
				setNodes((prev) => prev.map((n) => {
					const r = results[n.id];
					const out = outputs[n.id];
					let patch = null;
					if (r) {
						patch = { runtime: { status: "done", runId: rid, summary: r.summary || "", detail: r.detail || "", flagged: !!r.flagged, history: [{ runId: rid, status: "done", summary: r.summary || "", detail: r.detail || "", at: Date.now() }] } };
					}
					if (out) {
						patch = patch || {};
						patch.out = { ...(n.data.out || {}), ...out };
						if (!r) patch.runtime = { status: "done", runId: rid, summary: n.data.title + (out.path ? " " + out.path : ""), detail: "", history: [{ runId: rid, status: "done", summary: n.data.title, detail: "", at: Date.now() }] };
					}
					return patch ? { ...n, data: { ...n.data, ...patch } } : n;
				}));
			};

			const simulateDone = (node, rid) => {
				const kind = (node && node.kind) || "action";
				const title = (node && node.title) || "";
				const isLoop = kind === "loop" || (node && node.loop && node.loop.mode === "loop");
				const isReview = kind === "review" || kind === "dimension";
				const threshold = (node && node.loop && node.loop.threshold) || 0.7;
				let score = 0.8 + ((rid * 7 + String(node ? node.id : "").length) % 3) / 10; // deterministic-ish 0.8–0.98
				score = Math.min(1, Math.round(score * 100) / 100);
				const flagged = isLoop && score < threshold;
				let summary = "", detail = "";
				if (node && node.out && node.out.type === "file") {
					summary = fmt("sim.sum.file", { title, path: node.out.path || "" });
				} else if (isLoop) {
					summary = fmt("sim.sum.loop", { title, score: score.toFixed(2) });
					detail = flagged ? t("runtime.flagged") : "";
				} else if (isReview) {
					summary = fmt("sim.sum.review", { title, score: score.toFixed(2), issues: flagged ? t("runtime.flagged") : t("sim.issue.pass") });
				} else {
					const map = { plan: "sim.sum.plan", action: "sim.sum.action", summary: "sim.sum.summary", dimension: "sim.sum.dimension", root: "sim.sum.root" };
					summary = fmt(map[kind] || "sim.sum.default", { title });
				}
				const rt = { status: "done", runId: rid, summary, detail, score, flagged, history: [{ runId: rid, status: "done", summary, detail, at: Date.now() }] };
				if (isReview) rt.review = [{ dimension: t("sim.dim"), issue: flagged ? t("runtime.flagged") : t("sim.issue.pass"), pass: !flagged }];
				return rt;
			};

			const localSimulate = async (tree, rid) => {
				const stages = computeStages(tree.nodes, tree.edges);
				for (const stage of stages) {
					for (const id of stage) setNodeRuntime(id, { status: "running", runId: rid });
					await sleep(650);
					for (const id of stage) {
						const node = tree.nodes.find((n) => n.id === id);
						const rt = simulateDone(node, rid);
						setNodes((prev) => prev.map((n) => n.id === id
							? { ...n, data: { ...n.data, runtime: rt, out: node && node.out ? { ...(n.data.out || {}), ...node.out } : n.data.out } }
							: n));
					}
				}
			};

			const run = async () => {
				if (running) return;
				const tree = buildTree();
				if (!tree.nodes.length) { setRunInfo({ error: t("run.empty") }); return; }
				setRunning(true);
				setSimMode("none");
				setRunInfo(null);
				const rid = runId;
				setRunId(rid + 1);
				try {
					const res = await fetch("/api/dsh-workflow-studio/run", {
						method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, tree })
					});
					const data = await res.json();
					if (data && data.ok) {
						applyResults(data.value, rid);
						setRunInfo({ agents: data.agentsStarted, reason: data.stopReason });
					} else if (data && data.simulation) {
						setSimMode("engine");
						await localSimulate(tree, rid);
					} else {
						setRunInfo({ error: (data && data.error) || t("run.error") });
					}
				} catch (err) {
					setSimMode("offline");
					await localSimulate(tree, rid);
				} finally {
					setRunning(false);
				}
			};

			// ---- chat-driven generation ----
			const buildGeneratedTree = (text, keys) => {
				const steps = parseSteps(text, keys);
				const planText = text.trim();
				const hasLoop = new RegExp(keys.loop, "i").test(text);
				const nActions = Math.min(Math.max(steps.length, 1), 6);
				const nodes = [];
				const edges = [];
				const cx = 260;
				const Y = { root: 40, plan: 200, action: 380, review: 560, summary: 740 };
				const mk = (kind, title, agentId, prompt, x, y) => {
					const id = uid(kind);
					const data = { id, kind, title, agentId, prompt, files: [], review: [], loop: {}, out: null, runtime: null, iconColor: KIND_COLORS[kind], actionMode: kind === "action" ? "normal" : undefined };
					if (kind === "loop") data.loop = { mode: "loop", threshold: 0.7, maxAttempts: 3 };
					nodes.push({ id, type: "workflow", position: { x, y }, data });
					return id;
				};
				const link = (src, tgt, intent, label, extra) => {
					edges.push({ id: uid("e"), source: src, target: tgt, type: "smoothstep", label, labelBgPadding: [4, 2], labelBgBorderRadius: 6, data: { intent, detail: label, ...(extra || {}) } });
				};
				const root = mk("root", t("pal.root"), DEFAULT_AGENT.root, planText, cx - 70, Y.root);
				const planN = mk("plan", t("pal.plan"), DEFAULT_AGENT.plan, planText.slice(0, 80), cx - 70, Y.plan);
				link(root, planN, "context", t("edge.ctx"));
				const actionIds = [];
				const w = 210;
				const startX = cx - ((nActions - 1) * w) / 2 - 90;
				steps.slice(0, nActions).forEach((s, i) => {
					const kind = hasLoop && i === nActions - 1 ? "loop" : "action";
					const id = mk(kind, trunc(s, 16), DEFAULT_AGENT[kind], s, startX + i * w, Y.action);
					actionIds.push(id);
					link(planN, id, "artifact", t("edge.artifact"));
				});
				const reviewN = mk("review", t("pal.review"), DEFAULT_AGENT.review, "", cx - 70, Y.review);
				actionIds.forEach((id) => link(id, reviewN, "artifact", t("edge.artifact")));
				if (hasLoop && actionIds.length) link(reviewN, actionIds[actionIds.length - 1], "loop-gate", t("edge.loopGate"), { threshold: 0.7 });
				const sumN = mk("summary", t("pal.summary"), DEFAULT_AGENT.summary, "", cx - 70, Y.summary);
				link(reviewN, sumN, "artifact", t("edge.artifact"));
				return { nodes, edges };
			};

			const generate = async () => {
				const text = chatText.trim();
				if (!text) return;
				setChatText("");
				// 1) Try the real AI generator (subagent-backed /generate); fall back to the
				//    local heuristic builder when it's unavailable or fails.
				let built = null;
				try {
					const res = await fetch("/api/dsh-workflow-studio/generate", {
						method: "POST", headers: { "content-type": "application/json" },
						body: JSON.stringify({ sessionId, prompt: text })
					});
					const data = await res.json();
					if (data && data.ok && data.tree && Array.isArray(data.tree.nodes)) {
						built = treeToRF(data.tree, KIND_COLORS, DEFAULT_AGENT);
					}
				} catch { /* offline — fall through */ }
				try {
					if (!built) built = buildGeneratedTree(text, kindKeys);
					if (!built || !built.nodes.length) { setChat((c) => [...c, { role: "user", text }, { role: "ai", text: t("chat.failed") }]); return; }
					setNodes(built.nodes);
					setEdges(built.edges);
					setPlan(text);
					setChat((c) => [...c, { role: "user", text }, { role: "ai", text: fmt("chat.generated", { n: built.nodes.length, m: built.edges.length }) }]);
				} catch (e) {
					setChat((c) => [...c, { role: "user", text }, { role: "ai", text: t("chat.failed") }]);
				}
			};

			const grow = () => {
				const text = chatText.trim();
				if (!text) return;
				setChatText("");
				const kind = guessKind(text, kindKeys);
				const title = trunc(text, 16);
				const id = uid(kind);
				const data = { id, kind, title, agentId: DEFAULT_AGENT[kind], prompt: text, files: [], review: [], loop: {}, out: null, runtime: null, iconColor: KIND_COLORS[kind], actionMode: kind === "action" ? "normal" : undefined };
				if (kind === "loop") data.loop = { mode: "loop", threshold: 0.7, maxAttempts: 3 };
				const prev = nodes.length ? nodes[nodes.length - 1] : null;
				setNodes((prevNodes) => [...prevNodes, { id, type: "workflow", position: { x: 160 + Math.random() * 200, y: 100 + Math.random() * 240 }, data }]);
				if (prev) {
					const fromKind = prev.data.kind || "action";
					const g = fromKind === "review" || fromKind === "dimension"
						? (kind === "loop" ? { intent: "loop-gate", label: t("edge.loopGate") } : { intent: "review-feedback", label: t("edge.reviewFeedback") })
						: (kind === "review" || kind === "dimension" || kind === "loop" ? { intent: "artifact", label: t("edge.artifact") } : { intent: "context", label: t("edge.ctx") });
					setEdges((prevEdges) => [...prevEdges, { id: uid("e"), source: prev.id, target: id, type: "smoothstep", label: g.label, labelBgPadding: [4, 2], labelBgBorderRadius: 6, data: { intent: g.intent, detail: g.label, ...(kind === "loop" ? { threshold: 0.7 } : {}) } }]);
				}
				setChat((c) => [...c, { role: "user", text }, { role: "ai", text: fmt("chat.appended", { title }) }]);
			};

			const clearChat = () => { setChatText(""); setChat([]); };

			// ---- canvas interactions ----
			const addNode = (kind) => {
				if (kind === "root" && nodes.some((n) => n.data.kind === "root")) return;
				const id = uid(kind);
				const data = { id, kind, title: t("pal." + kind), agentId: DEFAULT_AGENT[kind], prompt: "", files: [], review: [], loop: {}, out: null, runtime: null, iconColor: KIND_COLORS[kind], actionMode: kind === "action" ? "normal" : undefined };
				if (kind === "loop") data.loop = { mode: "loop", threshold: 0.7, maxAttempts: 3 };
				setNodes((prev) => [...prev, { id, type: "workflow", position: { x: 120 + Math.random() * 160, y: 80 + Math.random() * 200 }, data }]);
				pendingAnimateRef.current.add(id);
			};

			const guessIntent = (fromKind, toKind) => {
				if ((fromKind === "review" || fromKind === "dimension") && toKind === "loop") return { intent: "loop-gate", label: t("edge.loopGate") };
				if (fromKind === "review" || fromKind === "dimension") return { intent: "review-feedback", label: t("edge.reviewFeedback") };
				if (toKind === "review" || toKind === "dimension" || toKind === "loop") return { intent: "artifact", label: t("edge.artifact") };
				return { intent: "context", label: t("edge.ctx") };
			};

			const onConnect = (conn) => {
				const from = nodes.find((n) => n.id === conn.source);
				const to = nodes.find((n) => n.id === conn.target);
				if (!from || !to) return;
				const fromKind = from.data.kind || "action";
				const toKind = to.data.kind || "action";
				const mkEdge = (intent, label, detail, threshold) => {
					const edge = { id: uid("e"), source: conn.source, target: conn.target, type: "smoothstep", label, labelBgPadding: [4, 2], labelBgBorderRadius: 6, data: { intent, detail: detail || label, ...(threshold !== undefined ? { threshold } : {}) } };
					setEdges((prev) => [...prev, edge]);
					window.setTimeout(() => {
						const path = document.querySelector(`.react-flow__edge[data-id="${edge.id}"] path`);
						if (path) flowEdge(path);
					}, 60);
					setOverlay(null);
				};
				if (fromKind === "review" || fromKind === "dimension") {
					// Review landing semantics are AI-guessed via the host (loop-gate for loops,
					// review-feedback otherwise) and shown as the edge label; the user can tweak.
					// For a non-loop target, also suggest a NON-DUPLICATE review angle when the
					// target already has reviews (multi-review smart suggestion).
					const targetAngle = (from.data && from.data.angle) || "";
					const existing = (to.data && Array.isArray(to.data.review)) ? to.data.review.map((r) => r.angle || r.dimension || "").filter(Boolean) : [];
					const useSuggested = toKind !== "loop" && !targetAngle && existing.length > 0;
					Promise.all([
						fetch("/api/dsh-workflow-studio/review-landing", {
							method: "POST", headers: { "content-type": "application/json" },
							body: JSON.stringify({ reviewKind: fromKind, targetKind: toKind, targetTitle: to.data.title || "" })
						}).then((r) => r.json()),
						useSuggested
							? fetch("/api/dsh-workflow-studio/review-suggest", {
								method: "POST", headers: { "content-type": "application/json" },
								body: JSON.stringify({ existingAngles: existing })
							}).then((r) => r.json())
							: Promise.resolve(null)
					]).then(([landing, suggestion]) => {
						if (landing && landing.ok) {
							let label = landing.label, detail = landing.detail;
							if (suggestion && suggestion.ok && !suggestion.meta) {
								label = suggestion.angle + "·检查反馈";
								detail = `对「${to.data.title || ""}」做${suggestion.angle}检查与反馈。`;
							}
							mkEdge(landing.intent, label, detail, toKind === "loop" ? 0.7 : undefined);
						} else mkEdge("review-feedback", t("edge.reviewFeedback"), "", undefined);
					}).catch(() => mkEdge("review-feedback", t("edge.reviewFeedback"), "", undefined));
				} else {
					const g = guessIntent(fromKind, toKind);
					mkEdge(g.intent, g.label, "", undefined);
				}
			};

			// ---- persistence ----
			const exportWorkflow = () => {
				const data = { type: "dsh-workflow-studio", version: 2, name: t("title"), ...buildTree(), customAgents, status: "draft" };
				const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url; a.download = "workflow.tree.json";
				document.body.appendChild(a); a.click(); a.remove();
				URL.revokeObjectURL(url);
			};

			const mapKind = (k) => {
				if (k === "start") return "root";
				if (k === "research") return "action";
				return NODE_KINDS.indexOf(k) >= 0 ? k : "action";
			};

			const importWorkflow = (file) => {
				if (!file) return;
				const reader = new FileReader();
				reader.onload = () => {
					try {
						const data = JSON.parse(String(reader.result));
						const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
						const hasRfShape = rawNodes.some((n) => n && typeof n.data === "object" && n.data !== null && n.data.kind);
						const ns = rawNodes.map((nd, i) => {
							if (!nd || typeof nd !== "object") return null;
							let kind, base;
							if (hasRfShape && nd.data) {
								kind = mapKind(nd.data.kind);
								base = { ...nd.data, kind, iconColor: KIND_COLORS[kind] || nd.data.iconColor };
							} else {
								kind = mapKind(nd.kind);
								base = {
									id: String(nd.id || ("n" + i)), kind, title: nd.title || t("pal." + kind),
									agentId: nd.agentId || DEFAULT_AGENT[kind], prompt: nd.prompt || "",
									files: Array.isArray(nd.files) ? nd.files : [], review: Array.isArray(nd.review) ? nd.review : [],
									loop: nd.loop || {}, out: nd.out || null, iconColor: KIND_COLORS[kind]
								};
							}
							return {
								id: String(nd.id || ("n" + i)), type: "workflow",
								position: nd.pos && typeof nd.pos.x === "number" ? { x: nd.pos.x, y: nd.pos.y } : (nd.position || { x: 60 + i * 30, y: 60 + i * 60 }),
								data: { files: [], review: [], loop: {}, out: null, runtime: null, ...base }
							};
						}).filter(Boolean);
						const es = (Array.isArray(data.edges) ? data.edges : []).filter((e) => e && e.source && e.target).map((e) => ({
							id: e.id || ("e-" + e.source + "-" + e.target), source: e.source, target: e.target, type: "smoothstep",
							label: e.label || intentLabel(e.intent), labelBgPadding: [4, 2], labelBgBorderRadius: 6,
							data: e.data || { intent: EDGE_INTENTS.indexOf(e.intent) >= 0 ? e.intent : "context" }
						}));
						setNodes(ns);
						setEdges(es);
						if (typeof data.plan === "string") setPlan(data.plan);
						if (Array.isArray(data.customAgents)) setCustomAgents(data.customAgents);
					} catch (err) { /* invalid file */ }
				};
				reader.readAsText(file);
			};

			const save = () => {
				const tree = buildTree();
				const body = { id: "default", name: t("title"), ...tree, status: "draft" };
				fetch("/api/dsh-workflow-studio/workflow", {
					method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
				}).then((r) => r.json()).then(() => { setSaved(true); window.setTimeout(() => setSaved(false), 1500); })
					.catch(() => { setSaved(true); window.setTimeout(() => setSaved(false), 1500); });
			};

			// ---- overlay mutations ----
			const saveNodePatch = (id, patch) => {
				setNodes((prev) => prev.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
			};
			const saveEdgePatch = (id, patch) => {
				setEdges((prev) => prev.map((e) => e.id === id
					? { ...e, label: patch.label, data: { ...e.data, intent: patch.intent, detail: patch.detail || patch.label, ...(patch.threshold !== undefined ? { threshold: patch.threshold } : {}) } }
					: e));
			};
			const deleteEdge = (id) => { setEdges((prev) => prev.filter((e) => e.id !== id)); };
			const addCustomAgent = (a) => { setCustomAgents((prev) => [...prev, a]); };
			const removeCustomAgent = (id) => { setCustomAgents((prev) => prev.filter((a) => a.id !== id)); };

			// ---- derived render values ----
			if (!ready) return jsx("div", { className: "ws-view", children: jsx("div", { className: "ws-title", children: t("loading") }) });
			if (!window.ReactFlow) return jsx("div", { className: "ws-view", children: jsx("div", { className: "ws-title", children: t("rf.fail") }) });

			const RF = window.ReactFlow;
			const nodeTypes = { workflow: (p) => jsx(WorkflowNode, { data: p.data, selected: p.selected }) };
			const paletteItems = NODE_KINDS.map((k) => ({ kind: k, label: t("pal." + k), color: KIND_COLORS[k] }));

			const activeEdgeIds = new Set();
			if (running) for (const n of nodes) if (n.data?.runtime?.status === "running") for (const e of edges) if (e.source === n.id) activeEdgeIds.add(e.id);
			const displayEdges = edges.map((e) => activeEdgeIds.has(e.id) ? { ...e, className: "ws-edgeActive", style: { stroke: "#FF3B30" } } : e);

			const onNodesChange = (changes) => setNodes((prev) => (RF.applyNodeChanges ? RF.applyNodeChanges(changes, prev) : prev));
			const onEdgesChange = (changes) => setEdges((prev) => (RF.applyEdgeChanges ? RF.applyEdgeChanges(changes, prev) : prev));
			const onNodeClick = (e, node) => setOverlay({ type: "node", node });
			const onEdgeClick = (e, edge) => setOverlay({ type: "edge", edge });

			const stopText = (() => {
				if (!runInfo) return "";
				const parts = [];
				if (typeof runInfo.agents === "number") parts.push(fmt("run.agents", { n: runInfo.agents }));
				if (runInfo.reason) parts.push(fmt("run.stop", { r: runInfo.reason }));
				return parts.join(" · ");
			})();

			const agentList = Object.keys(agentRegistry).map((k) => agentRegistry[k]);
			const customIds = new Set(customAgents.map((a) => a.id));
			const existingAgentIds = Object.keys(presetAgents).concat(customAgents.map((a) => a.id));

			return jsxs("div", { className: "ws-view", children: [
				jsxs("div", { className: "ws-toolbar", children: [
					jsx("h3", { className: "ws-title", children: t("title") }),
					jsx("span", { className: "ws-sub", children: t("sub") }),
					jsx("div", { className: "ws-runbar", children: [
						simMode !== "none" ? jsx("span", { className: "ws-simBadge", children: simMode === "engine" ? t("run.sim") : t("run.simOffline") }) : null,
						stopText ? jsx("span", { className: "ws-status", children: stopText }) : null,
						jsx("select", { value: bubbleModeState, onChange: (e) => setBubbleModeState(e.target.value), className: "ws-runSel", title: t("set.bubbleLabel"), children: [
							jsx("option", { value: "default", children: t("set.bubbleDefault") }),
							jsx("option", { value: "float", children: t("set.bubbleFloat") })
						] }),
						jsx("button", { type: "button", className: "ws-btn", onClick: exportWorkflow, title: t("export"), children: t("export") }),
						jsx("button", { type: "button", className: "ws-btn", onClick: () => fileInputRef.current && fileInputRef.current.click(), children: t("import") }),
						jsx("input", { ref: fileInputRef, type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: (e) => { importWorkflow(e.target.files && e.target.files[0]); e.target.value = ""; } }),
						jsx("button", { type: "button", className: "ws-btn" + (running ? "" : " primary"), onClick: run, disabled: running, children: running ? t("run.running") : t("run") }),
						jsx("button", { type: "button", className: "ws-btn", onClick: save, children: saved ? t("saved") : t("save") })
					] })
				] }),
				jsxs("div", { className: "ws-body", children: [
					jsxs("div", { className: "ws-chat", children: [
						jsxs("div", { className: "ws-chatHead", children: [
							jsx("span", { children: t("chat.title") }),
							jsx("button", { type: "button", className: "ws-btn ws-btnSm", onClick: () => setAgentsOpen(!agentsOpen), children: t("agents.title") })
						] }),
						jsxs("div", { className: "ws-msgs", children: [
							chat.length === 0 ? jsx("div", { className: "ws-chatEmpty", children: t("chat.empty") }) : null,
							chat.map((m, i) => jsxs("div", { className: "ws-msg " + (m.role === "user" ? "user" : "ai"), key: i, children: [
								jsx("div", { className: "ws-msgRole", children: m.role === "user" ? t("chat.user") : t("chat.assistant") }),
								jsx("div", { children: m.text })
							] }))
						] }),
						jsxs("div", { className: "ws-chatFoot", children: [
							jsxs("div", { className: "ws-chatInputRow", children: [
								jsx("input", { className: "ws-chatInput", value: chatText, onChange: (e) => setChatText(e.target.value), onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); generate(); } }, placeholder: t("chat.placeholder") }),
								jsx("button", { type: "button", className: "ws-btn primary", onClick: generate, children: t("chat.generate") })
							] }),
							jsxs("div", { className: "ws-chatActions", children: [
								jsx("button", { type: "button", className: "ws-btn", onClick: grow, disabled: !chatText.trim(), children: t("chat.grow") }),
								jsx("button", { type: "button", className: "ws-btn", onClick: clearChat, children: t("chat.clear") })
							] })
						] }),
						agentsOpen ? jsxs("div", { className: "ws-agents", children: [
							jsxs("div", { className: "ws-agentsHead", children: [
								jsx("span", { children: t("agents.title") }),
								jsx("button", { type: "button", className: "ws-btn ws-btnSm", onClick: () => setOverlay({ type: "agent" }), children: t("agents.add") })
							] }),
							agentList.map((a) => jsxs("div", { className: "ws-agentRow", key: a.id, children: [
								jsx("span", { className: "ws-agentName", children: a.name }),
								customIds.has(a.id) ? jsx("span", { className: "ws-agentCustom", children: t("agents.custom") }) : null,
								jsx("span", { className: "ws-agentRole", children: a.role }),
								customIds.has(a.id) ? jsx("button", { type: "button", className: "ws-agentDel", title: t("agents.delete"), onClick: () => removeCustomAgent(a.id), children: "\u00d7" }) : null
							] }))
						] }) : null
					] }),
					jsxs("div", { className: "ws-canvas", children: [
						nodes.length === 0 ? jsx("div", { className: "ws-canvasEmpty", children: t("canvas.empty") }) : null,
						runInfo && runInfo.error && !running ? jsx("div", { className: "ws-runError", children: runInfo.error }) : null,
						jsxs("div", { className: "ws-palette", children: [
							jsx("h5", { children: t("palette") }),
							paletteItems.map((item) => jsx("button", { type: "button", className: "ws-palItem", key: item.kind, onClick: () => addNode(item.kind), children: [diamondIcon(item.color), jsx("span", { children: item.label })] }))
						] }),
						jsx(RF.ReactFlow, {
							nodes, edges: displayEdges, nodeTypes, onConnect, onNodesChange, onEdgesChange,
							onNodeClick, onEdgeClick, fitView: true, colorMode: isDarkMode() ? "dark" : "light", deleteKeyCode: null,
							children: [
								jsx(RF.Background, {}),
								jsx(RF.MiniMap, {}),
								jsx(RF.Controls, {})
							]
						})
					] })
				] }),
				overlay && overlay.type === "node" ? jsx(NodeEditOverlay, { t, node: overlay.node, agents: agentRegistry, onSave: saveNodePatch, onDelete: deleteNode, onCancel: () => setOverlay(null) }) : null,
				overlay && overlay.type === "edge" ? jsx(EdgeEditOverlay, { t, edge: overlay.edge, onSave: saveEdgePatch, onDelete: deleteEdge, onCancel: () => setOverlay(null) }) : null,
				overlay && overlay.type === "agent" ? jsx(AgentFormOverlay, { t, existingIds: existingAgentIds, onSave: addCustomAgent, onCancel: () => setOverlay(null) }) : null
			] });
		}
		//#endregion

		//#region NodeEditOverlay
		function NodeEditOverlay({ t, node, agents, onSave, onDelete, onCancel }) {
			const d = node.data || {};
			const [title, setTitle] = react.useState(d.title || "");
			const [agentId, setAgentId] = react.useState(d.agentId || "");
			const [prompt, setPrompt] = react.useState(d.prompt || "");
			const [outType, setOutType] = react.useState(d.out && d.out.type ? d.out.type : "none");
			const [outPath, setOutPath] = react.useState((d.out && d.out.path) || "");
			const [outText, setOutText] = react.useState((d.out && d.out.text) || "");
			const [useLoop, setUseLoop] = react.useState(!!(d.loop && d.loop.mode === "loop"));
			const [threshold, setThreshold] = react.useState(String((d.loop && d.loop.threshold) || 0.7));
			const [maxAttempts, setMaxAttempts] = react.useState(String((d.loop && d.loop.maxAttempts) || 3));
			let agentOptions = Object.keys(agents).map((k) => agents[k]);
			if (agentId && !agents[agentId]) agentOptions = [{ id: agentId, name: agentId, role: "", prompt: "" }].concat(agentOptions);
			const save = () => {
				const patch = {
					title: title || d.title || node.id,
					agentId: agentId || DEFAULT_AGENT[d.kind] || "agent.executor",
					prompt,
					out: outType === "none" ? null : { type: outType, path: outPath, text: outText },
					loop: useLoop ? { mode: "loop", threshold: Number(threshold) || 0.7, maxAttempts: Number(maxAttempts) || 3 } : { ...(d.loop || {}), mode: undefined }
				};
				onSave(node.id, patch);
				onCancel();
			};
			return jsx("div", { className: "ws-overlay", onClick: (e) => { if (e.target === e.currentTarget) onCancel(); }, children: jsxs("div", { className: "ws-card", children: [
				jsx("h4", { children: t("node.editTitle") }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.agent") }), jsx("select", { className: "ws-input", value: agentId, onChange: (e) => setAgentId(e.target.value), children: agentOptions.map((a) => jsx("option", { value: a.id, key: a.id, children: a.name + (a.role ? " (" + a.role + ")" : "") })) })] }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.title") }), jsx("input", { className: "ws-input", value: title, onChange: (e) => setTitle(e.target.value) })] }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.prompt") }), jsx("textarea", { className: "ws-input", value: prompt, onChange: (e) => setPrompt(e.target.value) })] }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.outNone") }), jsx("select", { className: "ws-input", value: outType, onChange: (e) => setOutType(e.target.value), children: [
					jsx("option", { value: "none", children: t("node.outNone") }),
					jsx("option", { value: "file", children: t("node.outFile") }),
					jsx("option", { value: "text", children: t("node.outText") })
				] })] }),
				outType === "file" ? jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.outPath") }), jsx("input", { className: "ws-input", value: outPath, onChange: (e) => setOutPath(e.target.value), placeholder: "output/report.md" })] }) : null,
				outType === "text" ? jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.outTextLabel") }), jsx("textarea", { className: "ws-input", value: outText, onChange: (e) => setOutText(e.target.value) })] }) : null,
				jsxs("label", { className: "ws-field", style: { flexDirection: "row", alignItems: "center", gap: 8 }, children: [
					jsx("input", { type: "checkbox", checked: useLoop, onChange: (e) => setUseLoop(e.target.checked) }),
					jsx("span", { children: t("node.loopMode") })
				] }),
				useLoop ? jsxs("div", { className: "ws-row", children: [
					jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.threshold") }), jsx("input", { type: "number", className: "ws-input", min: 0, max: 1, step: 0.05, value: threshold, onChange: (e) => setThreshold(e.target.value) })] }),
					jsx("div", { className: "ws-field", children: [jsx("label", { children: t("node.maxAttempts") }), jsx("input", { type: "number", className: "ws-input", min: 1, max: 10, step: 1, value: maxAttempts, onChange: (e) => setMaxAttempts(e.target.value) })] })
				] }) : null,
				jsxs("div", { className: "ws-footRow", children: [
					jsx("button", { type: "button", className: "ws-btn ws-delBtn", onClick: () => { onDelete(node.id); onCancel(); }, children: t("node.deleteBtn") }),
					jsx("div", { style: { flex: 1 } }),
					jsx("button", { type: "button", className: "ws-btn", onClick: onCancel, children: t("cancel") }),
					jsx("button", { type: "button", className: "ws-btn primary", onClick: save, children: t("confirm") })
				] })
			] }) });
		}
		//#endregion

		//#region EdgeEditOverlay
		function EdgeEditOverlay({ t, edge, onSave, onDelete, onCancel }) {
			const ed = edge.data || {};
			const [intent, setIntent] = react.useState(EDGE_INTENTS.indexOf(ed.intent) >= 0 ? ed.intent : "custom");
			const [label, setLabel] = react.useState(edge.label || "");
			const [threshold, setThreshold] = react.useState(String(ed.threshold != null ? ed.threshold : 0.7));
			const save = () => {
				onSave(edge.id, { intent, label: label || intentLabelLocal(t, intent), threshold: intent === "loop-gate" ? Number(threshold) || 0.7 : undefined });
				onCancel();
			};
			return jsx("div", { className: "ws-overlay", onClick: (e) => { if (e.target === e.currentTarget) onCancel(); }, children: jsxs("div", { className: "ws-card", children: [
				jsx("h4", { children: t("edge.title") }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("edge.intent") }), jsx("select", { className: "ws-input", value: intent, onChange: (e) => setIntent(e.target.value), children: EDGE_INTENTS.map((k) => jsx("option", { value: k, key: k, children: intentLabelLocal(t, k) })) })] }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("edge.label") }), jsx("input", { className: "ws-input", value: label, onChange: (e) => setLabel(e.target.value) })] }),
				intent === "loop-gate" ? jsx("div", { className: "ws-field", children: [jsx("label", { children: t("edge.threshold") }), jsx("input", { type: "number", className: "ws-input", min: 0, max: 1, step: 0.05, value: threshold, onChange: (e) => setThreshold(e.target.value) })] }) : null,
				jsxs("div", { className: "ws-footRow", children: [
					jsx("button", { type: "button", className: "ws-btn ws-delBtn", onClick: () => { onDelete(edge.id); onCancel(); }, children: t("edge.delete") }),
					jsx("div", { style: { flex: 1 } }),
					jsx("button", { type: "button", className: "ws-btn", onClick: onCancel, children: t("cancel") }),
					jsx("button", { type: "button", className: "ws-btn primary", onClick: save, children: t("confirm") })
				] })
			] }) });
		}
		function intentLabelLocal(t, intent) {
			const m = { context: t("edge.ctx"), artifact: t("edge.artifact"), "prompt-inject": t("edge.promptInject"), "review-feedback": t("edge.reviewFeedback"), "loop-gate": t("edge.loopGate"), output: t("edge.output"), custom: t("edge.custom") };
			return m[intent] || t("edge.custom");
		}
		//#endregion

		//#region AgentFormOverlay
		function AgentFormOverlay({ t, existingIds, onSave, onCancel }) {
			const [id, setId] = react.useState("");
			const [name, setName] = react.useState("");
			const [role, setRole] = react.useState("action");
			const [prompt, setPrompt] = react.useState("");
			const [err, setErr] = react.useState("");
			const save = () => {
				const clean = id.trim();
				if (!clean) { setErr(t("agents.id")); return; }
				if (existingIds.indexOf(clean) >= 0) { setErr(t("agents.dup")); return; }
				onSave({ id: clean, name: name.trim() || clean, role: role.trim() || "action", prompt: prompt.trim() });
				onCancel();
			};
			return jsx("div", { className: "ws-overlay", onClick: (e) => { if (e.target === e.currentTarget) onCancel(); }, children: jsxs("div", { className: "ws-card", children: [
				jsx("h4", { children: t("agents.add") }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("agents.id") }), jsx("input", { className: "ws-input", value: id, onChange: (e) => setId(e.target.value), placeholder: "agent.custom1" })] }),
				jsx("div", { className: "ws-row", children: [
					jsx("div", { className: "ws-field", children: [jsx("label", { children: t("agents.name") }), jsx("input", { className: "ws-input", value: name, onChange: (e) => setName(e.target.value) })] }),
					jsx("div", { className: "ws-field", children: [jsx("label", { children: t("agents.role") }), jsx("input", { className: "ws-input", value: role, onChange: (e) => setRole(e.target.value), placeholder: "action" })] })
				] }),
				jsx("div", { className: "ws-field", children: [jsx("label", { children: t("agents.prompt") }), jsx("textarea", { className: "ws-input", value: prompt, onChange: (e) => setPrompt(e.target.value) })] }),
				err ? jsx("div", { className: "ws-err", children: err }) : null,
				jsxs("div", { className: "ws-footRow", children: [
					jsx("div", { style: { flex: 1 } }),
					jsx("button", { type: "button", className: "ws-btn", onClick: onCancel, children: t("cancel") }),
					jsx("button", { type: "button", className: "ws-btn primary", onClick: save, children: t("confirm") })
				] })
			] }) });
		}
		//#endregion

		//#region animation (M5)
		// Apple spring constants: emphasise 1/157.9/17.6 (~0.5s + bounce .3).
		// back.out(1.5) ≈ a single subtle overshoot — closest GSAP-native mapping.
		function prefersReducedMotion() {
			return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		}
		function playNodeIn(el) {
			if (!window.gsap || !el) return;
			if (prefersReducedMotion()) { window.gsap.set(el, { opacity: 1, scale: 1, y: 0 }); return; }
			window.gsap.set(el, { transition: "none" });
			window.gsap.fromTo(el, { opacity: 0, scale: 0.9, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.5)", clearProps: "transform,transition" });
		}
		function flowEdge(el) {
			if (!el) return;
			el.classList.add("ws-edgeFlow");
		}
		//#endregion

		//#region settings
		function SettingsSection({ t }) {
			const [mode, setMode] = react.useState(pluginSettings.bubbleMode || "default");
			const update = (m) => { setMode(m); pluginSettings.bubbleMode = m; bubbleMode = m; };
			return jsxs("div", { style: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }, children: [
				jsx("h3", { style: { margin: 0 }, children: t("title") }),
				jsxs("label", { style: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }, children: [
					jsx("span", { children: t("set.bubbleLabel") }),
					jsx("select", { value: mode, onChange: (e) => update(e.target.value), style: { fontSize: 13, padding: "6px 8px", borderRadius: 8 }, children: [
						jsx("option", { value: "default", children: t("set.bubbleDefault") }),
						jsx("option", { value: "float", children: t("set.bubbleFloat") })
					] })
				] })
			] });
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
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "workflow-studio",
				order: 60,
				locale: NS,
				label: () => t("title")
			}, (props) => jsx(SettingsSection, { t, close: props.close })));
		}
		//#endregion

		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
};
window.__ModuleLoader__.load({ id: "@eave_bounty/dsh-workflow-studio", factory: dshWorkflowStudioFactory });
window.__ModuleLoader__.load({ id: "dsh-workflow-studio", factory: dshWorkflowStudioFactory });
