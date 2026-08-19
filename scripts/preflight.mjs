// @dsh-local/dsh-workflow-studio — preflight gate (run on `npm run check` / `npm pack`).
// Asserts the shipped artifacts are valid before publish:
//  1. manifest parses and exposes the DSH plugin markers;
//  2. referenced files exist;
//  3. the client bundle starts with the expected __ModuleLoader__ registration.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fail = (msg) => { console.error(`[preflight] FAIL: ${msg}`); process.exit(1); };
const pass = (msg) => console.log(`[preflight] ok: ${msg}`);

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

if (!pkg.dsh?.bundle?.patch) fail('package.json missing dsh.bundle.patch');
if (pkg.dsh?.client?.platform !== "web") fail('package.json dsh.client.platform must be "web"');
pass("manifest dsh.bundle.patch / dsh.client.platform");

for (const f of ["cordis.patch.yml", "LICENSE", "README.md", ...(pkg.files || []).map((x) => x.endsWith("/") ? x : x)]) {
	if (f.endsWith("/")) continue;
	if (!existsSync(join(root, f))) fail(`missing referenced file: ${f}`);
}
pass("referenced files exist");

const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
if (!/insert\s*:/s.test(patch)) fail("cordis.patch.yml has no insert block");
pass("cordis.patch.yml parses (insert block)");

const client = readFileSync(join(root, "lib", "client.js"), "utf8");
if (!/window\.__ModuleLoader__\.load\(\s*\{\s*id\s*:\s*"dsh-workflow-studio"/s.test(client.slice(0, 400))) {
	fail("lib/client.js does not start with window.__ModuleLoader__.load({ id: \"dsh-workflow-studio\" …");
}
pass("client bundle __ModuleLoader__ registration");

console.log("[preflight] PASS");
