// @dsh-local/dsh-workflow-studio — workflow data model + pure logic.
// No DSH services here: importable and unit-testable. DSH wiring lives in index.js.

export const WORKFLOW_DIR = ".dsh-workflow";

/** Edge intent kinds — semantic categories for what an edge "injects". */
export const EDGE_KINDS = [
	"research-focus",   // 调研关注点（from 开始/计划 → to 调研）
	"source",           // 数据/资料来源
	"context",          // 参考上下文
	"summary-input",    // 总结的输入
	"file-ref",         // 文件引用注入
	"prompt-inject",    // 注入到目标节点 Agent 的 prompt
	"artifact",         // 上游产出物
	"review-gate",      // 评审门
	"rework-target",    // 返工目标（loop 返回箭头）
	"custom"            // 自定义
];

export const NODE_KINDS = ["start", "research", "summary", "plan", "action", "review", "dimension"];
export const ACTION_MODES = ["normal", "ptc", "loop"];

const EMPTY = () => ({
	id: "start-1",
	name: "未命名工作流",
	nodes: [{ id: "start-1", kind: "start", title: "开始", pos: { x: 40, y: 120 } }],
	edges: [],
	plan: "",
	reviewCriteria: [],
	status: "draft"
});

/** Normalize a possibly-undefined workflow to a valid object. */
export function normalizeWorkflow(w) {
	const base = EMPTY();
	if (!w || typeof w !== "object") return base;
	return {
		id: typeof w.id === "string" ? w.id : base.id,
		name: typeof w.name === "string" ? w.name : base.name,
		nodes: Array.isArray(w.nodes) ? w.nodes : base.nodes,
		edges: Array.isArray(w.edges) ? w.edges : base.edges,
		plan: typeof w.plan === "string" ? w.plan : "",
		reviewCriteria: Array.isArray(w.reviewCriteria) ? w.reviewCriteria : [],
		status: ["draft", "running", "awaiting-review", "done"].includes(w.status) ? w.status : "draft"
	};
}

/** Deterministic candidate intents for an edge, given from/to node kinds & context.
 *  Design-time "edge carries meaning" generator. A real LLM pass can supersede these. */
export function edgeIntentCandidates(fromNode, toNode, ctx = {}) {
	const fk = fromNode?.kind ?? "";
	const tk = toNode?.kind ?? "";
	const out = [];
	const push = (kind, label, detail) => out.push({ kind, label, detail });

	if (fk === "start") {
		if (tk === "research") push("research-focus", "调研什么", "根据目标推导本次调研的关注点与范围");
		if (tk === "plan") push("context", "计划目标", "将整体目标注入计划节点作为规划依据");
		if (tk === "action") push("prompt-inject", "执行目标", "将目标注入 Action 节点作为执行指令");
	}
	if (fk === "research") {
		if (tk === "summary") push("summary-input", "总结调研结果", "汇总全部调研产出生成分析");
		if (tk === "summary") push("summary-input", "选择性调研结果", "按相关性筛选后总结");
		if (tk === "plan") push("source", "调研资料", "将调研结论作为计划的事实依据");
	}
	if (fk === "plan") {
		if (tk === "action") push("prompt-inject", "计划注入执行", "将计划内容注入 Action 节点作为执行依据");
		if (tk === "plan") push("context", "子计划分解", "承接上游计划做进一步分解");
	}
	if (fk === "action") {
		if (tk === "review") push("review-gate", "产出送审", "将 Action 产出交给 Review 审核");
		if (tk === "summary") push("artifact", "产出汇总", "将执行产出纳入总结");
	}
	if (fk === "review") {
		if (tk === "action") push("rework-target", "返工重做", "Loop：从该 Action 节点重新执行");
		if (tk === "review") push("context", "维度补审", "补充另一个审核维度");
	}
	if (fk === "summary") {
		if (tk === "action") push("artifact", "总结注入执行", "将分析结果注入下一步执行");
		if (tk === "plan") push("context", "结论回填计划", "将结论写回计划层");
	}

	// If a file/context detail is provided, incorporate it.
	if (ctx.plan && out.length === 0) push("custom", "依据目标", `依据计划：${String(ctx.plan).slice(0, 40)}`);
	out.push({ kind: "custom", label: "其他", detail: "自定义该边的目的/注入内容" });
	return out;
}

/** Whether an edge between two node kinds is semantically allowed (connection charter). */
export function edgeAllowed(fromKind, toKind) {
	const denied = new Set([
		"action->start", "review->start", "summary->start", "plan->start", "research->start",
		"start->start", "review->research", "dimension->start", "dimension->research"
	]);
	return !denied.has(`${fromKind}->${toKind}`);
}

/** Assign a default EdgeKind label given a kind. */
export function edgeKindLabel(kind) {
	const m = {
		"research-focus": "调研关注点", "source": "资料来源", "context": "上下文",
		"summary-input": "总结输入", "file-ref": "文件引用", "prompt-inject": "指令注入",
		"artifact": "产出物", "review-gate": "评审门", "rework-target": "返工", "custom": "自定义"
	};
	return m[kind] ?? kind;
}

/** Aggregate review findings: cluster identical/varied dimensions into a deduped checklist. */
export function dedupeReview(reviews) {
	if (!Array.isArray(reviews)) return [];
	const seen = new Set();
	const out = [];
	for (const r of reviews) {
		const key = (r?.dimension ?? "") + "|" + (r?.issue ?? "").trim().toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push({ dimension: r?.dimension ?? "通用", issue: r?.issue ?? "", pass: !!r?.pass });
	}
	return out;
}

export { normalizeWorkflow as default };
