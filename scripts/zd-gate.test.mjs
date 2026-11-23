// Tests for scripts/zd-gate.mjs (spec 0003). Each test builds a throwaway git repo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check, normalizeGlob, approvalCommand, jobSummary, compileConfig, workflowYaml } from "./zd-gate.mjs";

const GATE = path.join(path.dirname(fileURLToPath(import.meta.url)), "zd-gate.mjs");
// Fake key built at runtime so this test file itself never holds a key shaped literal.
const FAKE_KEY = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), "zd-gate-"));
  const g = (...args) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout;
  };
  g("init", "-q", "-b", "main");
  g("config", "user.name", "Ada Tester");
  g("config", "user.email", "ada@example.com");
  g("config", "commit.gpgsign", "false");
  const write = (file, text) => {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  };
  const commit = (msg, files = {}) => {
    for (const [f, t] of Object.entries(files)) {
      if (t === null) g("rm", "-q", f);
      else write(f, t);
    }
    g("add", "-A");
    g("commit", "-q", "--allow-empty", "-m", msg);
  };
  const approve = (area, name = "Ada Tester") => g("commit", "-q", "--allow-empty", "-m", "Risk approval", "--trailer", `Risk-approved: ${area} (${name})`);
  commit("initial", { "README.md": "hello\n" });
  g("switch", "-q", "-c", "feature");
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  return { dir, g, write, commit, approve, cleanup };
}

const area = (r, id) => r.areas.find((a) => a.id === id);

test("AC-1: nothing guarded touched exits 0", () => {
  const t = repo();
  try {
    t.commit("docs", { "README.md": "hello again\n", "docs/guide.md": "# guide\n" });
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 0);
    assert.equal(r.areas.length, 0);
    assert.equal(r.commits, 1);
  } finally { t.cleanup(); }
});

test("AC-2: a key added then removed still blocks, and no trailer unblocks it", () => {
  const t = repo();
  try {
    t.commit("add key", { "src/pay.js": `const k = "${FAKE_KEY}";\n` });
    t.commit("remove key", { "src/pay.js": "const k = process.env.KEY;\n" });
    t.approve("secrets");
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 2);
    const s = area(r, "secrets");
    assert.equal(s.state, "blocked");
    assert.equal(s.approvedBy, undefined);
    const f = s.findings.find((x) => x.rule === "cloud access key id");
    assert.equal(f.file, "src/pay.js");
    assert.equal(f.line, 1);
    assert.equal(f.stillInFinalTree, false);
    assert.ok(!JSON.stringify(r).includes(FAKE_KEY), "the matched value is never in the output");
  } finally { t.cleanup(); }
});

test("AC-2: a guarded secret path blocks and carries no line", () => {
  const t = repo();
  try {
    t.commit("env", { "apps/web/.env": "X=1\n" });
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 2);
    const f = area(r, "secrets").findings[0];
    assert.equal(f.file, "apps/web/.env");
    assert.equal(f.line, undefined);
  } finally { t.cleanup(); }
});

test("AC-3: a workflow change without approval exits 1 with the approval command", () => {
  const t = repo();
  try {
    t.commit("rules", { "AGENTS.md": "# rules\n" });
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 1);
    const w = area(r, "workflow");
    assert.equal(w.state, "needs-ok");
    assert.deepEqual(w.approvers, ["Ada Tester"]);
    assert.equal(approvalCommand(w), 'git commit --allow-empty -m "Risk approval" --trailer "Risk-approved: workflow (Ada Tester)"');
  } finally { t.cleanup(); }
});

test("AC-4: approval counts only after the latest touching commit and only from an approver", () => {
  const t = repo();
  try {
    t.commit("rules", { "AGENTS.md": "# rules\n" });
    t.approve("workflow");
    t.commit("more rules", { "AGENTS.md": "# rules v2\n" });
    assert.equal(check(t.dir, { base: "main" }).code, 1, "stale approval is ignored");
    t.approve("workflow", "Mallory");
    assert.equal(check(t.dir, { base: "main" }).code, 1, "non approver is ignored");
    t.approve("workflow", "ada tester");
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 0, "case insensitive approver after the last touch passes");
    assert.equal(area(r, "workflow").state, "approved");
    assert.match(jobSummary(r), /\| workflow \| ada tester \|/);
  } finally { t.cleanup(); }
});

test("AC-5: except paths never trigger, for paths and content", () => {
  const t = repo();
  try {
    t.commit("example env", { ".env.example": `KEY=${FAKE_KEY}\n` });
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 0);
  } finally { t.cleanup(); }
});

test("AC-6: defaults apply without a risk file and warn", () => {
  const t = repo();
  try {
    t.commit("noop", { "a.txt": "a\n" });
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 0);
    assert.match(r.warnings[0], /zd-gate init/);
  } finally { t.cleanup(); }
});

test("AC-6: a project risk file replaces the defaults, and its edits are guarded", () => {
  const t = repo();
  try {
    t.commit("risk", {
      ".zd/risk.json": JSON.stringify({
        version: 1,
        approvers: ["Ada Tester"],
        areas: [{ id: "workflow", name: "Rules", why: "w", onTouch: "approve", paths: [".zd/", "global/"] }],
      }),
    });
    t.approve("workflow");
    t.commit("rules", { "global/RULES.md": "x\n" });
    const r = check(t.dir, { base: "main" });
    assert.equal(r.code, 1);
    assert.match(r.warnings[0], /first enrollment/);
    assert.deepEqual(area(r, "workflow").findings.map((f) => f.file), ["global/RULES.md", ".zd/risk.json"], "a new touch reopens the area and lists every touch");
  } finally { t.cleanup(); }
});

test("AC-6: errors exit 3 (bad risk file, missing base, not a repo)", () => {
  const t = repo();
  try {
    t.write(".zd/risk.json", "{ not json");
    const cli = (args, cwd = t.dir) => spawnSync(process.execPath, [GATE, ...args], { cwd, encoding: "utf8" });
    let r = cli(["main"]);
    assert.equal(r.status, 3);
    assert.match(r.stderr, /not valid JSON/);
    rmSync(path.join(t.dir, ".zd"), { recursive: true });
    r = cli(["nope"]);
    assert.equal(r.status, 3);
    assert.match(r.stderr, /does not exist/);
    const empty = mkdtempSync(path.join(tmpdir(), "zd-gate-norepo-"));
    r = cli([], empty);
    assert.equal(r.status, 3);
    rmSync(empty, { recursive: true, force: true });
  } finally { t.cleanup(); }
});

test("AC-6: a shallow clone without the merge base exits 3", () => {
  const t = repo();
  const clone = mkdtempSync(path.join(tmpdir(), "zd-gate-shallow-"));
  try {
    t.commit("one", { "a.txt": "1\n" });
    t.commit("two", { "a.txt": "2\n" });
    spawnSync("git", ["clone", "-q", "--depth", "1", "--no-single-branch", `file://${t.dir}`, clone]);
    spawnSync("git", ["switch", "-q", "feature"], { cwd: clone });
    const r = spawnSync(process.execPath, [GATE, "origin/main"], { cwd: clone, encoding: "utf8" });
    assert.equal(r.status, 3);
    assert.match(r.stderr, /shallow/);
  } finally { t.cleanup(); rmSync(clone, { recursive: true, force: true }); }
});

test("AC-7: --json prints the result with the same exit code", () => {
  const t = repo();
  try {
    t.commit("rules", { "CLAUDE.md": "@AGENTS.md\n" });
    const r = spawnSync(process.execPath, [GATE, "main", "--json"], { cwd: t.dir, encoding: "utf8" });
    assert.equal(r.status, 1);
    const out = JSON.parse(r.stdout);
    assert.equal(out.code, 1);
    assert.equal(out.areas[0].id, "workflow");
  } finally { t.cleanup(); }
});

test("merge commits: a key added while resolving a conflict blocks; merging main reports nothing", () => {
  const t = repo();
  try {
    t.g("switch", "-q", "main");
    t.commit("main change", { "conf.txt": "main\n" });
    t.g("switch", "-q", "feature");
    t.commit("feature change", { "conf.txt": "feature\n" });
    spawnSync("git", ["merge", "-q", "main"], { cwd: t.dir });
    t.write("conf.txt", `resolved ${FAKE_KEY}\n`);
    t.g("add", "-A");
    t.g("commit", "-q", "--no-edit");
    let r = check(t.dir, { base: "main" });
    assert.equal(r.code, 2);
    assert.equal(area(r, "secrets").findings[0].file, "conf.txt");

    const u = repo();
    try {
      u.g("switch", "-q", "main");
      u.commit("main rules", { "AGENTS.md": "# main rules\n" });
      u.g("switch", "-q", "feature");
      u.commit("feature", { "b.txt": "b\n" });
      u.g("merge", "-q", "--no-edit", "main");
      r = check(u.dir, { base: "main" });
      assert.equal(r.code, 0, "main's own guarded change is not reported again");
    } finally { u.cleanup(); }
  } finally { t.cleanup(); }
});

test("globs normalize gitignore style", () => {
  assert.equal(normalizeGlob("global/"), "global/**");
  assert.equal(normalizeGlob(".env"), "**/.env");
  assert.equal(normalizeGlob("/AGENTS.md"), "AGENTS.md");
  assert.equal(normalizeGlob(".github/workflows/"), ".github/workflows/**");
  assert.equal(normalizeGlob("src/*.ts"), "src/*.ts");
  assert.ok(path.matchesGlob("global/RULES.md", normalizeGlob("global/")));
  assert.ok(path.matchesGlob("apps/web/.env", normalizeGlob(".env")));
});

test("risk file validation rejects unsafe shapes", () => {
  const base = { version: 1, approvers: ["A"], areas: [{ id: "x", name: "X", why: "w", onTouch: "approve", paths: ["a/"] }] };
  assert.doesNotThrow(() => compileConfig(base));
  assert.throws(() => compileConfig({ ...base, version: 2 }), /version/);
  assert.throws(() => compileConfig({ ...base, approvers: [] }), /approvers/);
  assert.throws(() => compileConfig({ ...base, areas: [{ ...base.areas[0], onTouch: "block" }] }), /fix/);
  assert.throws(() => compileConfig({ ...base, areas: [{ ...base.areas[0], approvers: ["B"] }] }), /not in the top level/);
  assert.throws(() => compileConfig({ ...base, areas: [base.areas[0], base.areas[0]] }), /twice/);
});

test("AC-10: the CI workflow pins the gate, fetches full history, and runs Node 24", () => {
  const y = workflowYaml({ selfHosted: false, repo: "owner/zd", sha: "abc1234def" });
  assert.match(y, /fetch-depth: 0/);
  assert.match(y, /repository: owner\/zd\n\s+ref: abc1234def/);
  assert.match(y, /node-version: 24/);
  assert.match(y, /^  zd-gate:$/m);
  const self = workflowYaml({ selfHosted: true });
  assert.match(self, /git show "origin\/\$BASE:scripts\/zd-gate\.mjs"/, "Zero Dawn runs the base branch's gate");
});

test("a branch cannot loosen the rules that judge it: the base copy of the risk file wins", () => {
  const t = repo();
  try {
    const rules = (areas) => JSON.stringify({ version: 1, approvers: ["Ada Tester"], areas });
    const guard = { id: "workflow", name: "Rules", why: "w", onTouch: "approve", paths: [".zd/", "global/"] };
    t.g("switch", "-q", "main");
    t.commit("enroll", { ".zd/risk.json": rules([guard]) });
    t.g("switch", "-q", "-c", "sneaky");
    t.commit("loosen", {
      ".zd/risk.json": rules([{ id: "other", name: "O", why: "w", onTouch: "approve", paths: ["nothing/"] }]),
      "global/RULES.md": "weaker\n",
    });
    const r = check(t.dir, { base: "main" });
    assert.equal(r.rules, "main:.zd/risk.json");
    assert.equal(r.code, 1);
    assert.deepEqual(area(r, "workflow").findings.map((f) => f.file).sort(), [".zd/risk.json", "global/RULES.md"]);
  } finally { t.cleanup(); }
});
