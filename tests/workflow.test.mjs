// @dsh-local/dsh-workflow-studio — unit tests for lib/workflow.js pure logic.
// Run: node tests/workflow.test.mjs
import {
	normalizeWorkflow, edgeIntentCandidates, edgeAllowed, edgeKindLabel,
	dedupeReview, downstream, rollbackCascade, nextRunId, summarizeNode
} from "../lib/workflow.js";

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error(`  ✗ ${msg}`); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (${JSON.stringify(a)} vs ${JSON.stringify(b)})`); }

// normalizeWorkflow
ok(normalizeWorkflow(null).status === "draft", "normalize null");
eq(normalizeWorkflow({ id: "x", name: "N", status: "done" }).name, "N", "normalize keeps name");
ok(normalizeWorkflow({ status: "bogus" }).status === "draft", "normalize bad status");

// edgeAllowed
ok(edgeAllowed("start", "research"), "start->research allowed");
ok(edgeAllowed("action", "review"), "action->review allowed");
ok(edgeAllowed("review", "action"), "review->action (rework) allowed");
ok(!edgeAllowed("action", "start"), "action->start denied");

// edgeIntentCandidates
const cands = edgeIntentCandidates({ kind: "start" }, { kind: "research" });
ok(cands.length >= 1, "start->research has candidates");
ok(cands.some((c) => c.kind === "research-focus"), "has research-focus");
const rew = edgeIntentCandidates({ kind: "review" }, { kind: "action" });
ok(rew.some((c) => c.kind === "rework-target"), "review->action has rework-target");

// edgeKindLabel
eq(edgeKindLabel("rework-target"), "返工", "kind label");

// dedupeReview
eq(dedupeReview([{ dimension: "a", issue: "x", pass: false }, { dimension: "a", issue: "x", pass: true }]).length, 1, "dedupe identical");
eq(dedupeReview([{ dimension: "a", issue: "x" }, { dimension: "b", issue: "y" }]).length, 2, "keep distinct");

// downstream
const edges = [
	{ source: "a", target: "b" }, { source: "b", target: "c" }, { source: "a", target: "d" }
];
eq([...downstream("a", edges)].sort(), ["b", "c", "d"], "downstream transitive");
eq(downstream("c", edges).length, 0, "downstream leaf");

// rollbackCascade
const runtimes = {
	a: { history: [{ runId: 1, status: "done" }, { runId: 2, status: "done" }], pointer: 1 },
	b: { history: [{ runId: 2, status: "done" }], pointer: 0 },
	c: { history: [{ runId: 2, status: "done" }], pointer: 0 }
};
const rb = rollbackCascade(["a", "b", "c"], edges, runtimes, "a", 0);
eq(rb.a.pointer, 0, "a pointer to 0");
eq(rb.b.history.length, 0, "b cascade cleared");
eq(rb.c.history.length, 0, "c cascade cleared");

// nextRunId
eq(nextRunId(runtimes), 3, "next run id");

// summarizeNode
ok(summarizeNode({ kind: "research", title: "调研" }, "目标").includes("调研"), "summarize research");

console.log(`\nworkflow tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
