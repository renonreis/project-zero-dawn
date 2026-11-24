// Tests for the loop collector (spec 0005). GitHub is faked; git runs for real in temp repos.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  CAPS, LoopError, checkRun, classifyReviewFile, finish, localDay, nightlyRows, nightlyStart, parseGateLog, parseRegistry, parseReview, retroWindow, start, trailers,
} from "./loop-collect.mjs";

const NOW = new Date("2026-11-24T06:00:00Z");
const ago = (h) => new Date(NOW.getTime() - h * 3600e3).toISOString();
const tmp = () => realpathSync(mkdtempSync(path.join(os.tmpdir(), "zd-loop-")));
const KEY = "AKIA" + "ABCDEFGHIJKLMNOP";

function repo(root, name) {
  const dir = path.join(root, name);
  mkdirSync(dir, { recursive: true });
  const git = (args, at) => execFileSync("git", args, { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", ...(at ? { GIT_AUTHOR_DATE: at, GIT_COMMITTER_DATE: at } : {}) } }).trim();
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.name", "T"]);
  git(["config", "user.email", "t@example.com"]);
  return {
    dir, git,
    commit(hours, files, msg = "change") {
      for (const [f, c] of Object.entries(files)) { mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); writeFileSync(path.join(dir, f), c); }
      git(["add", "-A"]);
      git(["commit", "-q", "-m", msg], ago(hours));
      return git(["rev-parse", "HEAD"]);
    },
  };
}

const registry = (rows) => `# R\n\n| Project | Repo | Status | Live |\n|---|---|---|---|\n${rows.map(([n, r, s, l]) => `| ${n} | ${r ? `[${r}](https://github.com/${r})` : "not created"} | ${s} | ${l ?? ""} |`).join("\n")}\n\n## Columns\n`;

function world(rows, { get = () => { throw new LoopError("no fake"); }, list = () => [], now = NOW } = {}) {
  const root = tmp();
  const reg = path.join(root, "registry.md");
  writeFileSync(reg, registry(rows));
  const here = repo(root, "cwd");
  here.commit(100, { a: "1" });
  let n = 0;
  const deps = { now: () => now, get: (p, q) => (p === "user" ? "me\n" : get(p, q)), list, url: (r) => path.join(root, "remote", r) };
  return {
    root, here, deps, state: path.join(root, "state"),
    remote: (r) => repo(path.join(root, "remote"), r),
    start(loop) { this.run = path.join(root, `run${n++}`); return start({ loop, run: this.run, cwd: here.dir, state: this.state, registry: reg }, deps); },
    finish(text = "report") {
      const f = path.join(this.run, "report.md");
      writeFileSync(f, text);
      checkRun({ run: this.run }, deps);
      return finish({ run: this.run, report: f }, deps);
    },
    saved(loop) { return JSON.parse(readFileSync(path.join(this.state, `${loop}.json`), "utf8")); },
    seed(loop, data) { mkdirSync(this.state, { recursive: true }); writeFileSync(path.join(this.state, `${loop}.json`), JSON.stringify({ version: 1, loop, ...data })); },
  };
}
const LIVE = [["P", "me/p", "shipped", "yes"]];

test("registry: live rows, owner ok, missing column means no (AC-4)", () => {
  const rows = parseRegistry(registry([["A", "me/a", "shipped", "yes"], ["B", "me/b", "shipped", "no"], ["C", "other/c", "shipped", "yes"], ["D", "other/d", "shipped", "yes (owner ok 2026-11-20)"], ["E", null, "planned", "yes"]]));
  assert.deepEqual(nightlyRows(rows, "ME").map((r) => r.project), ["A", "D"]);
  const old = parseRegistry("| Project | Repo | Status |\n|---|---|---|\n| A | [me/a](x) | shipped |\n");
  assert.equal(old[0].live, "no");
  assert.throws(() => parseRegistry("nothing"), LoopError);
});

test("the real registry parses", () => {
  const rows = parseRegistry(readFileSync(new URL("../docs/portfolio/registry.md", import.meta.url), "utf8"));
  assert.ok(rows.some((r) => r.repo === "renonreis/project-zero-dawn"));
});

test("gate log: kinds, areas, and no match from an indented file name (AC-10)", () => {
  const t = "2026-11-23T15:43:20.1234567Z ";
  assert.deepEqual(parseGateLog(`${t}NEEDS OK  workflow · Workflow rules\n${t}  - abc BLOCKED  x · y\n${t}Result: STOP. An approval is missing.`), { kind: "needs-ok", areas: [{ id: "workflow", state: "needs-ok" }] });
  assert.equal(parseGateLog(`${t}Result: BLOCKED. Fix before merging.`).kind, "blocked");
  assert.equal(parseGateLog(`${t}zd-gate: no merge base`).kind, "error");
  assert.equal(parseGateLog("checkout failed").kind, "unknown");
});

test("trailers need the whole form", () => {
  assert.deepEqual(trailers("x\n\nRisk-approved: workflow (Ana)\nRisk-approved trailers, run in /sync"), [{ area: "workflow", name: "Ana" }]);
});

test("review files: kind by the word after the date, two grammars (AC-11)", () => {
  assert.equal(classifyReviewFile("docs/reviews/2026-11-21-review-test-harness.md").kind, "review");
  assert.equal(classifyReviewFile("docs/reviews/2026-11-21-verify-test-harness-2.md").kind, "verify");
  assert.equal(classifyReviewFile(".workflow/reviews/2026-11-21-test-x.md").kind, "test");
  assert.equal(classifyReviewFile("docs/specs/2026-11-21-x.md"), null);
  assert.deepEqual(parseReview("verify", "**Verdict**: FAIL\n"), { verdict: "FAIL" });
  assert.equal(parseReview("verify", "**Verdict: PASS. ok**"), null);
  assert.deepEqual(parseReview("review", "**Verdict**: Approve\n\n## Summary\n### x\n"), { verdict: "Approve", blockers: [] });
  assert.deepEqual(parseReview("review", "**Verdict**: Blocked\n\n## Blockers\n### one\ntext\n### two\n\n## Major\n### three\n").blockers, ["one", "two"]);
  assert.deepEqual(parseReview("review", "**Verdict**: Blocked\n## Blockers\n### last").blockers, ["last"]);
});

test("retro window: first run, since last, over the limit (AC-9)", () => {
  assert.equal(retroWindow(null, NOW).start, "2026-11-17T06:00:00Z");
  assert.equal(retroWindow({ finishedAt: "2026-11-20T06:01:00Z", windowEnd: "2026-11-20T06:00:00Z" }, NOW).start, "2026-11-20T06:00:00Z");
  const w = retroWindow({ finishedAt: "2026-09-01T00:00:00Z" }, NOW);
  assert.equal(w.start, "2026-10-27T06:00:00Z");
  assert.equal(w.gap.from, "2026-09-01T00:00:00Z");
});

test("nightly: no live project reads nothing (AC-4, AC-6)", () => {
  const w = world([["P", "me/p", "shipped", "no"], ["X", "other/x", "shipped", "yes"]]);
  const e = w.start("nightly");
  assert.equal(e.liveProjects, 0);
  assert.equal(e.quiet, true);
  assert.deepEqual(e.projects, []);
});

test("nightly: merge, second merge, and direct push since the record; state moves to head (AC-5, AC-18)", () => {
  const w = world(LIVE);
  const r = w.remote("me/p");
  r.commit(200, { "base.txt": "b\n" });
  r.git(["switch", "-qc", "old"]);
  r.commit(190, { "m1.txt": "old commit date\n" });
  r.git(["switch", "-q", "main"]);
  const rec = r.commit(30, { "x.txt": "x\n" });
  r.git(["merge", "-q", "--no-ff", "-m", "merge 1", "old"], ago(20));
  r.git(["switch", "-qc", "two"]);
  r.commit(15, { "m2.txt": "two\n" });
  r.git(["switch", "-q", "main"]);
  r.git(["merge", "-q", "--no-ff", "-m", "merge 2", "two"], ago(10));
  const head = r.commit(5, { "direct.txt": "d\n" });
  w.seed("nightly", { finishedAt: ago(30), heads: { "me/p": { sha: rec, recordedAt: ago(29) } } });
  const e = w.start("nightly");
  assert.deepEqual(e.projects[0].reviewed.map((f) => f.file), ["direct.txt", "m1.txt", "m2.txt"]);
  assert.match(readFileSync(e.projects[0].diffFile, "utf8"), /\+old commit date/);
  assert.equal(existsSync(path.join(w.state, "reports")), false);
  w.finish();
  assert.deepEqual(w.saved("nightly").heads["me/p"], { sha: head, recordedAt: "2026-11-24T06:00:00Z" });
  const again = w.start("nightly");
  assert.equal(again.quiet, true);
});

test("nightly start: 3 days, 9 days with gap, quiet 9 days, rewritten, first run (AC-5)", () => {
  const r = repo(tmp(), "p");
  const a = r.commit(400, { a: "1" });
  const b = r.commit(8 * 24, { a: "2" });
  const c = r.commit(3 * 24, { a: "3" });
  r.commit(2, { a: "4" });
  assert.deepEqual(nightlyStart(r.dir, { sha: c, recordedAt: ago(72) }, NOW), { from: c });
  const gap = nightlyStart(r.dir, { sha: a, recordedAt: ago(9 * 24) }, NOW);
  assert.equal(gap.from, b);
  assert.equal(gap.gap.fromCommit, a.slice(0, 7));
  assert.deepEqual(nightlyStart(r.dir, { sha: b, recordedAt: ago(9 * 24) }, NOW), { from: b });
  const rew = nightlyStart(r.dir, { sha: "f".repeat(40), recordedAt: ago(24) }, NOW);
  assert.equal(rew.from, c);
  assert.match(rew.alert, /rewritten/);
  assert.equal(nightlyStart(r.dir, null, NOW).from, c);
});

test("nightly: young repo reads from the empty tree and says the root was not gate checked (AC-5)", () => {
  const w = world(LIVE);
  const r = w.remote("me/p");
  r.commit(5, { "a.txt": "root\n" });
  r.commit(4, { "b.txt": "b\n" });
  const p = w.start("nightly").projects[0];
  assert.deepEqual(p.reviewed.map((f) => f.file), ["a.txt", "b.txt"]);
  assert.match(p.alert, /root commit/);
});

test("nightly: cap, risk order, generated, binary, and nothing lost silently (AC-7)", () => {
  const w = world(LIVE);
  const r = w.remote("me/p");
  const lines = (n) => Array.from({ length: n }, (_, i) => `l${i}`).join("\n") + "\n";
  r.commit(100, { "seed.txt": "s\n", ".gitattributes": "gen/* linguist-generated\n" });
  r.commit(5, { "a.txt": lines(2500), "b.txt": lines(2490), "CLAUDE.md": lines(10), "package-lock.json": lines(9), "gen/x.js": lines(5), "img.bin": "\0\0", "dist/y.js": "1\n" });
  const p = w.start("nightly").projects[0];
  assert.deepEqual(p.reviewed.map((f) => f.file), ["CLAUDE.md", "a.txt"]);
  assert.equal(p.changedLines, 2510);
  assert.ok(p.changedLines <= CAPS.lines);
  assert.deepEqual(p.notReviewed.map((f) => f.file).sort(), ["b.txt", "dist/y.js", "gen/x.js", "img.bin", "package-lock.json"]);
});

test("nightly: secrets are found and never written out (AC-8)", () => {
  const w = world(LIVE);
  const r = w.remote("me/p");
  r.commit(100, { "seed.txt": "s\n" });
  r.commit(5, { "conf.js": `const ok = 1;\nconst k = "${KEY}";\n`, ".env": `A=${KEY}\n` });
  const e = w.start("nightly");
  const p = e.projects[0];
  assert.ok(p.secretFindings.some((f) => f.file === "conf.js"));
  assert.ok(p.notReviewed.some((f) => f.file === ".env" && /withheld/.test(f.why)));
  const diff = readFileSync(p.diffFile, "utf8");
  assert.match(diff, /const ok/);
  assert.ok(!diff.includes(KEY) && !JSON.stringify(e).includes(KEY));
});

test("nightly: a failed project keeps its old record, the others move (AC-18)", () => {
  const w = world([["P", "me/p", "shipped", "yes"], ["Q", "me/gone", "shipped", "yes"]]);
  const head = (() => { const r = w.remote("me/p"); r.commit(100, { a: "1" }); return r.commit(2, { a: "2" }); })();
  const old = { sha: "a".repeat(40), recordedAt: ago(26) };
  w.seed("nightly", { finishedAt: ago(26), heads: { "me/gone": old } });
  const e = w.start("nightly");
  assert.ok(e.projects.find((p) => p.repo === "me/gone").error);
  w.finish();
  assert.deepEqual(w.saved("nightly").heads["me/gone"], old);
  assert.equal(w.saved("nightly").heads["me/p"].sha, head);
});

test("nightly: five projects, oldest record first, the rest keep their record (AC-7)", () => {
  const names = ["a", "b", "c", "d", "e", "f", "g"];
  const w = world(names.map((n) => [n, `me/${n}`, "shipped", "yes"]));
  const heads = {};
  names.forEach((n, i) => {
    const r = w.remote(`me/${n}`);
    const sha = r.commit(100, { x: "1" });
    r.commit(2, { x: "2" });
    if (n !== "g") heads[`me/${n}`] = { sha, recordedAt: ago(30 - i) };
  });
  w.seed("nightly", { finishedAt: ago(24), heads });
  const e = w.start("nightly");
  assert.deepEqual(e.projects.map((p) => p.project), ["g", "a", "b", "c", "d"]);
  assert.deepEqual(e.leftOut, ["me/e", "me/f"]);
  w.finish();
  assert.deepEqual(w.saved("nightly").heads["me/f"], heads["me/f"]);
});

test("fingerprint: clean, then a new ref, a commit, and a failure (AC-2)", () => {
  const w = world(LIVE);
  const r = w.remote("me/p");
  r.commit(2, { a: "1" });
  w.start("nightly");
  assert.deepEqual(checkRun({ run: w.run }, w.deps), { differences: [], failed: [] });
  w.here.git(["update-ref", "refs/t3/checkpoint", "HEAD"]);
  assert.deepEqual(checkRun({ run: w.run }, w.deps).differences, []);
  r.git(["branch", "sneaky"]);
  w.here.commit(1, { z: "1" });
  const d = checkRun({ run: w.run }, w.deps).differences.join("\n");
  assert.match(d, /me\/p refs: refs\/heads\/sneaky appeared/);
  assert.match(d, /checkout: HEAD changed/);
  const broken = checkRun({ run: w.run }, { ...w.deps, list: () => { throw new LoopError("down"); } });
  assert.match(broken.failed[0], /open items: down/);
});

test("finish: needs check and a real report; saves the report before state (AC-18)", () => {
  const w = world(LIVE);
  w.remote("me/p").commit(2, { a: "1" });
  w.start("nightly");
  const f = path.join(w.run, "r.md");
  writeFileSync(f, "ok");
  assert.throws(() => finish({ run: w.run, report: f }, w.deps), /run check/);
  checkRun({ run: w.run }, w.deps);
  writeFileSync(f, " \n");
  assert.throws(() => finish({ run: w.run, report: f }, w.deps), /empty/);
  assert.equal(existsSync(path.join(w.state, "nightly.json")), false);
  writeFileSync(w.state, "a file where the folder should be");
  writeFileSync(f, "ok");
  assert.throws(() => finish({ run: w.run, report: f }, w.deps), /could not save/);
});

// ---------- retro with a fake GitHub ----------

function hub({ workflow = true, files = {}, pulls = [], runs = [], fail = () => false } = {}) {
  const missing = () => { const e = new LoopError("HTTP 404"); e.status404 = true; return e; };
  const shaOf = (f) => Buffer.from(f).toString("hex");
  return {
    get(p) {
      if (fail(p)) throw new LoopError("server down");
      if (/^repos\/[^/]+\/[^/]+$/.test(p)) return "main\n";
      if (p.includes("/git/trees/")) return JSON.stringify({ truncated: false, files: Object.keys(files).map((f) => ({ path: f, sha: shaOf(f) })) });
      if (p.includes("/git/blobs/")) return JSON.stringify({ content: Buffer.from(files[Buffer.from(p.split("/").pop(), "hex").toString()]).toString("base64") });
      if (p.includes("/attempts/1") && !p.includes("jobs")) return JSON.stringify({ conclusion: "failure", run_started_at: "2026-11-22T10:00:00Z" });
      if (p.endsWith("/logs")) return "NEEDS OK  workflow · Workflow rules\nResult: STOP. An approval is missing.";
      if (p.includes("/commits/")) return "Squash\n\nRisk-approved: workflow (Ana)";
      throw new Error(`unexpected get ${p}`);
    },
    list(p) {
      if (fail(p)) throw new LoopError("server down");
      if (p.includes("/issues")) return [];
      if (p.includes("/workflows/")) { if (!workflow) throw missing(); return runs; }
      if (p.includes("/jobs")) return [{ id: 9, conclusion: "failure" }];
      if (p.includes("/pulls?")) return pulls;
      if (p.includes("/pulls/")) return ["feat: x"];
      if (p.includes("/commits?")) return [{ sha: "abcdef123", message: "x\n\nRisk-approved: workflow (Ana)" }];
      throw new Error(`unexpected list ${p}`);
    },
  };
}
const PULL = { number: 7, state: "closed", created: "2026-11-22T09:00:00Z", merged: "2026-11-22T12:00:00Z", mergeSha: "m", branch: "feat/secret-name", head: "h" };
const RUN = { id: 1, run_attempt: 2, head_branch: "feat/secret-name", created_at: "2026-11-22T10:00:00Z", updated_at: "2026-11-22T11:00:00Z", conclusion: "success" };

test("retro: every attempt counts, later approval, verify and review counts (AC-9, AC-10)", () => {
  const files = {
    "docs/reviews/2026-11-22-feat-x.md": "**Verdict**: Blocked\n## Blockers\n### bad\n",
    "docs/reviews/2026-11-22-feat-x-2.md": "**Verdict**: Approve\n",
    "docs/reviews/2026-11-22-verify-x.md": "**Verdict**: FAIL\n",
    "docs/reviews/2026-11-22-verify-y.md": "odd\n",
    "docs/reviews/2026-09-01-feat-old.md": "**Verdict**: Blocked\n",
    [`docs/reviews/${localDay(NOW)}-today.md`]: "**Verdict**: Blocked\n",
  };
  const w = world([["P", "me/p", "in-progress"], ["Z", "me/z", "archived"]], hub({ files, pulls: [PULL], runs: [RUN] }));
  w.remote("me/p").commit(2, { a: "1" });
  const e = w.start("retro");
  assert.equal(e.projects.length, 1);
  const p = e.projects[0];
  assert.equal(p.gate.count, 1);
  assert.deepEqual(p.gate.stops["PR #7"].map((s) => [s.kind, s.laterApproved, s.areas]), [["needs-ok", "trailer", ["workflow"]]]);
  assert.equal(p.gate.approvals[0].area, "workflow");
  assert.deepEqual(p.review.verdicts, { Blocked: 1, Approve: 1 });
  assert.equal(p.review.blockers, 1);
  assert.deepEqual(p.verify.verdicts, { FAIL: 1 });
  assert.deepEqual(p.verify.unparsed, ["docs/reviews/2026-11-22-verify-y.md"]);
  assert.equal(e.quiet, false);
  w.finish("first");
  assert.equal(readdirSync(path.join(w.state, "reports")).length, 1);
  assert.ok(w.start("retro").previousReport.endsWith("retro-20261124T060000Z.md"));
});

test("retro: missing is no evidence, present but idle is zero (AC-9)", () => {
  const none = world([["P", "me/p", "in-progress"]], hub({ workflow: false })).start("retro").projects[0];
  for (const s of ["gate", "verify", "review"]) assert.equal(none[s].evidence, "no evidence");
  const idle = world([["P", "me/p", "in-progress"]], { ...hub({ files: { "docs/reviews/2026-01-01-verify-a.md": "x", "docs/reviews/2026-01-01-b.md": "x" } }), list: (p) => (p.includes("/commits?") ? [] : hub().list(p)) }).start("retro");
  for (const s of ["gate", "verify", "review"]) assert.equal(idle.projects[0][s].count, 0);
  assert.equal(idle.quiet, true);
  const down = world([["P", "me/p", "in-progress"]], hub({ fail: (p) => p.includes("/git/trees/") })).start("retro").projects[0];
  assert.equal(down.review.evidence, "no evidence");
  assert.equal(down.gate.count, 0);
});

test("retro: an external repo carries only counts and verdicts (AC-13)", () => {
  const files = { "docs/reviews/2026-11-22-secret-name.md": "**Verdict**: Blocked\n## Blockers\n### secret title\n", "docs/reviews/2026-11-22-verify-secret-name.md": "odd" };
  const e = world([["C", "other/c", "in-progress"]], hub({ files, pulls: [PULL], runs: [RUN] })).start("retro");
  const text = JSON.stringify(e);
  assert.ok(!/secret|workflow\b.*Ana|docs\/reviews|actions\/runs|Ana/.test(text), text);
  assert.equal(e.projects[0].review.blockers, 1);
  assert.equal(e.projects[0].verify.unparsed, 1);
  assert.equal(e.projects[0].gate.count, 1);
});
