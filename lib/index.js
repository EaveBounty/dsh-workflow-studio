// @dsh-local/dsh-workflow-studio — host half.
// Exposes design-time HTTP endpoints to the web client:
//   GET/POST /api/dsh-workflow-studio/workflow        → list / save workflows
//   POST      /api/dsh-workflow-studio/edge-intent     → candidate intents for an edge
//   POST      /api/dsh-workflow-studio/review-dedupe   → dedupe review findings
// Plus a sessionProjection for live token/cache stats.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { z as zodZ } from "zod";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
import { normalizeWorkflow, edgeIntentCandidates, edgeAllowed, dedupeReview, rollbackCascade, nextRunId, summarizeNode, downstream } from "./workflow.js";

const name = "workflow-studio";
const inject = ["webServer", "sessionProjections"];
const PROFILE = "web";

function storeDir(dshHome) {
	return process.env.DSH_WORKFLOW_DIR || join(dshHome, "profiles", PROFILE, ".dsh-workflow");
}

function listWorkflows(dshHome) {
	const dir = storeDir(dshHome);
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter((f) => extname(f) === ".json").map((f) => {
		try { return normalizeWorkflow(JSON.parse(readFileSync(join(dir, f), "utf8"))); }
		catch { return null; }
	}).filter(Boolean);
}

function saveWorkflow(dshHome, body) {
	const wf = normalizeWorkflow(body);
	const dir = storeDir(dshHome);
	mkdirSync(dir, { recursive: true });
	const file = join(dir, `${wf.id}.json`);
	writeFileSync(file, JSON.stringify(wf, null, 2), "utf8");
	return wf;
}

function json(res, code, obj) {
	res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(obj));
}

function readBody(req) {
	return new Promise((resolve) => {
		let data = "";
		req.on("data", (c) => { data += c; if (data.length > 4 * 1024 * 1024) req.destroy(); });
		req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
		req.on("error", () => resolve({}));
	});
}

function apply(ctx) {
	ctx.effect(() => {
		ctx.sessionProjections.register({
			key: "workflowStudioStats",
			stateVersion: 1,
			schema: zodZ.object({
				input: zodZ.number().nonnegative(),
				cacheRead: zodZ.number().nonnegative(),
				cacheWrite: zodZ.number().nonnegative(),
				output: zodZ.number().nonnegative(),
				reasoning: zodZ.number().nonnegative()
			}),
			init: () => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0, reasoning: 0 }),
			apply: (state, event) => {
				const d = event.data;
				if (event.type === "assistant/chunk" && d?.chunk?.type === "usage" && d.chunk.usage) {
					const u = d.chunk.usage;
					return {
						input: state.input + (u.inputTokens ?? 0),
						cacheRead: state.cacheRead + (u.cacheReadTokens ?? 0),
						cacheWrite: state.cacheWrite + (u.cacheWriteTokens ?? 0),
						output: state.output + (u.outputTokens ?? 0),
						reasoning: state.reasoning + (u.reasoningTokens ?? 0)
					};
				}
				return state;
			},
			view: (state) => state
		});
	}, "workflow-studio: session projection");

	ctx.effect(() => {
		ctx.webServer.register({
			kind: "exact",
			path: "/api/dsh-workflow-studio/workflow",
			handler: async (req, res) => {
				try {
					const dshHome = resolveDshHome();
					if (req.method === "GET" || req.method === "HEAD") {
						json(res, 200, { ok: true, workflows: listWorkflows(dshHome) });
						return;
					}
					if (req.method === "POST") {
						const body = await readBody(req);
						const wf = saveWorkflow(dshHome, body);
						json(res, 200, { ok: true, workflow: wf });
						return;
					}
					json(res, 405, { ok: false, error: "method not allowed" });
				} catch (error) {
					json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
		});
	}, "workflow-studio: /api/dsh-workflow-studio/workflow");

	ctx.effect(() => {
		ctx.webServer.register({
			kind: "exact",
			path: "/api/dsh-workflow-studio/edge-intent",
			handler: async (req, res) => {
				try {
					if (req.method !== "POST") { json(res, 405, { ok: false }); return; }
					const b = await readBody(req);
					const allowed = edgeAllowed(String(b.fromKind ?? ""), String(b.toKind ?? ""));
					const candidates = allowed
						? edgeIntentCandidates(
							{ kind: String(b.fromKind ?? "") },
							{ kind: String(b.toKind ?? "") },
							{ plan: typeof b.plan === "string" ? b.plan : "" }
						)
						: [];
					json(res, 200, { ok: true, allowed, candidates });
				} catch (error) {
					json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
		});
	}, "workflow-studio: /api/dsh-workflow-studio/edge-intent");

	ctx.effect(() => {
		ctx.webServer.register({
			kind: "exact",
			path: "/api/dsh-workflow-studio/summarize",
			handler: async (req, res) => {
				try {
					if (req.method !== "POST") { json(res, 405, { ok: false }); return; }
					const b = await readBody(req);
					const node = b.node || {};
					const plan = typeof b.plan === "string" ? b.plan : "";
					json(res, 200, { ok: true, summary: summarizeNode(node, plan), detail: summarizeNode(node, plan) + "（详细执行汇报待接入 DSH 子代理后生成）" });
				} catch (error) {
					json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
		});
	}, "workflow-studio: /api/dsh-workflow-studio/summarize");

	ctx.effect(() => {
		ctx.webServer.register({
			kind: "exact",
			path: "/api/dsh-workflow-studio/review-dedupe",
			handler: async (req, res) => {
				try {
					if (req.method !== "POST") { json(res, 405, { ok: false }); return; }
					const b = await readBody(req);
					json(res, 200, { ok: true, reviews: dedupeReview(Array.isArray(b.reviews) ? b.reviews : []) });
				} catch (error) {
					json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
		});
	}, "workflow-studio: /api/dsh-workflow-studio/review-dedupe");
}

export { name, inject, apply, normalizeWorkflow, edgeIntentCandidates, edgeAllowed, dedupeReview, rollbackCascade, nextRunId, summarizeNode, downstream, storeDir, listWorkflows, saveWorkflow };
