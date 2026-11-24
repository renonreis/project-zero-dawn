#!/usr/bin/env node
// loop-collect: evidence for the scheduled loops (spec docs/specs/0005).
// Read requests only; writes only to the run folder and the state folder.
//
//   loop-collect start <nightly|retro> --run <dir> --cwd <dir> [--state <dir>] [--registry <file>]
//   loop-collect check --run <dir>
//   loop-collect finish --run <dir> --report <file>
//
// Exit: 0 ok (check: clean) · 1 check found differences · 3 error.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILT_IN_AREAS, GateError, check as gateCheck, compileConfig, loadConfig } from "./zd-gate.mjs";

export class LoopError extends Error {}

const HOUR = 3600e3;
const DAY = 24 * HOUR;
export const CAPS = { projects: 5, lines: 3000, lineChars: 500, nightlyDays: 7, retroDays: 28 };
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const GENERATED = ["**/*.lock", "**/package-lock.json", "**/pnpm-lock.yaml", "**/dist/**", "**/build/**", "**/*.min.*"];
const REVIEW_FILE = /^(?:docs|\.workflow)\/reviews\/(\d{4}-\d{2}-\d{2})-([^/]+)\.md$/;
const TRAILER = /^Risk-approved:\s*([a-z0-9][a-z0-9-]*)\s*\((.+?)\)\s*$/gim;

// ---------- commands ----------

const ENV = { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_LFS_SKIP_SMUDGE: "1", GIT_OPTIONAL_LOCKS: "0", GH_PROMPT_DISABLED: "1" };

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, env: ENV, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  if (r.error) throw new LoopError(`${cmd} could not run: ${r.error.message}`);
  return r;
}

const GIT_FLAGS = ["-c", "core.quotepath=off", "-c", "core.hooksPath=/dev/null", "-c", "credential.helper=", "-c", "credential.helper=!gh auth git-credential"];

function git(args, cwd) {
  const r = run("git", [...GIT_FLAGS, ...args], cwd);
  if (r.status !== 0) throw new LoopError(`git ${args[0]} failed: ${(r.stderr || "").trim().split("\n")[0]}`);
  return r.stdout;
}
const gitOk = (args, cwd) => run("git", [...GIT_FLAGS, ...args], cwd).status === 0;

/** The only door to GitHub: `gh api` with GET. Returns stdout; throws with `status404` when the resource is missing. */
function ghGet(apiPath, jq, { paginate = false } = {}) {
  const args = ["api", "--method", "GET", apiPath];
  if (paginate) args.push("--paginate");
  if (jq) args.push("-q", jq);
  let r = run("gh", args);
  // Action logs carry color codes; newer gh versions ask for a flag that older ones do not know. Only parsed, never printed.
  if (r.status !== 0 && /--allow-escape-sequences/.test(r.stderr || "")) r = run("gh", [...args, "--allow-escape-sequences"]);
  if (r.status !== 0) {
    const e = new LoopError(`GitHub read failed (${apiPath.split("?")[0]}): ${(r.stderr || "").trim().split("\n")[0]}`);
    e.status404 = /HTTP 404/.test(r.stderr || "");
    throw e;
  }
  return r.stdout;
}

export function realDeps() {
  return {
    now: () => new Date(),
    get: (p, jq) => ghGet(p, jq),
    list: (p, jq) => ghGet(p, `${jq} | @json`, { paginate: true }).split("\n").filter(Boolean).map((l) => JSON.parse(l)),
    url: (repo) => `https://github.com/${repo}.git`,
  };
}

// ---------- small helpers ----------

const iso = (d) => new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
export const stamp = (d) => iso(d).replace(/[-:]/g, "");
/** The local calendar day, as file names in docs/reviews use it. */
export function localDay(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
function writeJson(f, data) {
  writeFileSync(`${f}.tmp`, JSON.stringify(data, null, 2) + "\n");
  renameSync(`${f}.tmp`, f);
}
const matchesAny = (globs, file) => globs.some((g) => path.matchesGlob(file, g));
const oneLine = (e) => String(e?.message ?? e).split("\n")[0];
export const trailers = (text) => [...text.matchAll(TRAILER)].map((m) => ({ area: m[1].toLowerCase(), name: m[2].trim() }));

// ---------- registry and state ----------

export function parseRegistry(text) {
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim());
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.startsWith("|") && cells(l).includes("Project") && cells(l).includes("Repo"));
  if (at < 0) throw new LoopError("the registry has no table with Project and Repo columns.");
  const head = cells(lines[at]);
  const rows = [];
  for (const l of lines.slice(at + 2)) {
    if (!l.startsWith("|")) break;
    const c = cells(l);
    const col = (n) => (head.includes(n) ? (c[head.indexOf(n)] ?? "") : "");
    rows.push({
      project: col("Project"),
      repo: /\[([\w.-]+\/[\w.-]+)\]\(/.exec(col("Repo"))?.[1] ?? null,
      status: col("Status"),
      live: col("Live") || "no",
    });
  }
  return rows;
}

/** AC-4: exactly the live rows, and a repo someone else owns also needs their recorded ok. */
export function nightlyRows(rows, login) {
  return rows.filter((r) => {
    if (!r.repo) return false;
    const ok = /^yes \(owner ok \d{4}-\d{2}-\d{2}\)$/.test(r.live);
    return ok || (r.live === "yes" && isOwn(r.repo, login));
  });
}
const isOwn = (repo, login) => repo.split("/")[0].toLowerCase() === login.toLowerCase();

const defaultState = () => path.join(os.homedir(), ".local/state/zero-dawn/loops");

export function loadState(dir, loop) {
  const f = path.join(dir, `${loop}.json`);
  if (!existsSync(f)) return null;
  let s;
  try { s = readJson(f); } catch { throw new LoopError(`${f} is not valid JSON.`); }
  if (s.version !== 1) throw new LoopError(`${f} has an unknown version.`);
  return s;
}

// ---------- fingerprint ----------

const refMap = (text) => Object.fromEntries(
  text.split("\n").filter(Boolean).map((l) => l.split(/\s+/))
    .filter(([, ref]) => ref === "HEAD" || /^refs\/(heads|tags)\//.test(ref) || /^refs\/pull\/\d+\/head$/.test(ref))
    .map(([sha, ref]) => [ref, sha]),
);

export function fingerprint(repos, cwd, deps) {
  const out = {};
  const take = (key, fn) => { try { out[key] = fn(); } catch (e) { out[key] = { failed: oneLine(e) }; } };
  for (const repo of repos) {
    take(`${repo} refs`, () => refMap(git(["ls-remote", deps.url(repo)])));
    take(`${repo} open items`, () => Object.fromEntries(
      deps.list(`repos/${repo}/issues?state=open&per_page=100`, ".[] | {number, updated_at}").map((i) => [`#${i.number}`, i.updated_at])));
  }
  // refs/t3/ are session checkpoints T3 writes during every run, this one included.
  take("checkout", () => ({
    HEAD: git(["rev-parse", "HEAD"], cwd).trim(),
    status: createHash("sha256").update(git(["status", "--porcelain"], cwd)).digest("hex").slice(0, 12),
    ...Object.fromEntries(git(["for-each-ref", "--exclude=refs/t3/", "--format=%(objectname) %(refname)"], cwd).split("\n").filter(Boolean).map((l) => l.split(" ").reverse())),
  }));
  return out;
}

export function compareFingerprints(a, b) {
  const differences = [];
  const failed = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const [x, y] = [a[key] ?? {}, b[key] ?? {}];
    if (x.failed || y.failed) { failed.push(`${key}: ${x.failed ?? y.failed}`); continue; }
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (x[k] === y[k]) continue;
      differences.push(`${key}: ${k} ${x[k] === undefined ? "appeared" : y[k] === undefined ? "disappeared" : "changed"}`);
    }
  }
  return { differences, failed };
}

// ---------- retro evidence ----------

const NO = (why) => ({ evidence: "no evidence", why });

export function retroWindow(state, now) {
  const end = now.getTime();
  const last = state ? Date.parse(state.windowEnd ?? state.finishedAt) : null;
  if (last === null) return { start: iso(end - 7 * DAY), end: iso(end) };
  const oldest = end - CAPS.retroDays * DAY;
  return last >= oldest
    ? { start: iso(last), end: iso(end) }
    : { start: iso(oldest), end: iso(end), gap: { from: iso(last), to: iso(oldest) } };
}

/** Exit kind and areas from a gate log (AC-10). Finding lines are indented, so file names cannot fake a match. */
export function parseGateLog(log) {
  const lines = log.split("\n").map((l) => l.replace(/^﻿?\d{4}-\d\d-\d\dT[\d:.]+Z ?/, "").replace(/\x1b\[[0-9;]*m/g, "").trimEnd());
  const areas = [];
  let kind = "unknown";
  for (const l of lines) {
    const a = /^(NEEDS OK|BLOCKED) {2}([a-z0-9][a-z0-9-]*) · /.exec(l);
    if (a) areas.push({ id: a[2], state: a[1] === "BLOCKED" ? "blocked" : "needs-ok" });
    if (l === "Result: STOP. An approval is missing.") kind = "needs-ok";
    else if (l.startsWith("Result: BLOCKED.")) kind = "blocked";
    else if (kind === "unknown" && l.startsWith("zd-gate: ")) kind = "error";
  }
  return { kind, areas };
}

function gateEvidence(repo, own, branch, pulls, win, deps) {
  let runs;
  try {
    runs = deps.list(
      `repos/${repo}/actions/workflows/zd-gate.yml/runs?per_page=100&created=${win.start}..${win.end}`,
      ".workflow_runs[] | {id, run_attempt, head_branch, created_at, conclusion, updated_at}");
  } catch (e) {
    return NO(e.status404 ? "no zd-gate workflow" : oneLine(e));
  }
  try {
    const attempts = [];
    for (const r of runs) {
      for (let n = 1; n < r.run_attempt; n++) {
        const a = JSON.parse(deps.get(`repos/${repo}/actions/runs/${r.id}/attempts/${n}`));
        attempts.push({ id: r.id, n, branch: r.head_branch, at: a.run_started_at ?? a.created_at, conclusion: a.conclusion });
      }
      attempts.push({ id: r.id, n: r.run_attempt, branch: r.head_branch, at: r.run_attempt > 1 ? r.updated_at : r.created_at, conclusion: r.conclusion });
    }
    const stops = attempts.filter((a) => a.conclusion === "failure" || a.conclusion === "timed_out").map((a) => {
      let parsed = { kind: "unknown", areas: [] };
      let why;
      try {
        const jobs = deps.list(`repos/${repo}/actions/runs/${a.id}/attempts/${a.n}/jobs?per_page=100`, ".jobs[] | {id, conclusion}");
        const job = jobs.find((j) => j.conclusion !== "success");
        if (job) parsed = parseGateLog(deps.get(`repos/${repo}/actions/jobs/${job.id}/logs`));
      } catch (e) { why = oneLine(e); }
      const pr = pulls.filter((p) => p.branch === a.branch).sort((x, y) => Math.abs(Date.parse(x.created) - Date.parse(a.at)) - Math.abs(Date.parse(y.created) - Date.parse(a.at)))[0];
      const green = attempts.some((o) => o.branch === a.branch && o.conclusion === "success" && Date.parse(o.at) > Date.parse(a.at));
      let trailer = false;
      if (pr?.merged && parsed.areas.length) {
        const text = [
          ...deps.list(`repos/${repo}/pulls/${pr.number}/commits?per_page=100`, ".[] | .commit.message"),
          pr.mergeSha ? deps.get(`repos/${repo}/commits/${pr.mergeSha}`, ".commit.message") : "",
        ].join("\n");
        const ids = new Set(trailers(text).map((t) => t.area));
        trailer = parsed.areas.filter((x) => x.state === "needs-ok").every((x) => ids.has(x.id)) && parsed.kind === "needs-ok";
      }
      const base = { at: a.at, pr: pr?.number ?? null, kind: parsed.kind, laterApproved: trailer ? "trailer" : green ? "green run" : false };
      return own ? { ...base, branch: a.branch, areas: parsed.areas.map((x) => x.id), ...(why ? { why } : {}), url: `https://github.com/${repo}/actions/runs/${a.id}/attempts/${a.n}` } : base;
    });
    const approvals = deps.list(`repos/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${win.start}&until=${win.end}&per_page=100`, ".[] | {sha, message: .commit.message}")
      .flatMap((c) => trailers(c.message).map((t) => (own ? { commit: c.sha.slice(0, 7), area: t.area, name: t.name } : { area: "withheld" })));
    const groups = {};
    for (const s of stops) {
      const key = s.pr ? `PR #${s.pr}` : own ? `branch ${s.branch}` : "no PR";
      (groups[key] ??= []).push(s);
    }
    return {
      count: stops.length,
      runs: attempts.length,
      stops: groups,
      approvals: own ? approvals : { count: approvals.length },
      note: "Local gate stops before a push are not counted.",
    };
  } catch (e) {
    return NO(oneLine(e));
  }
}

/** A name right after the date says the kind; `-verify-` deeper in the name is part of a branch or feature. */
export function classifyReviewFile(file) {
  const m = REVIEW_FILE.exec(file);
  if (!m) return null;
  const kind = /^(verify|test)-/.exec(m[2])?.[1] ?? "review";
  return { date: m[1], kind };
}

export function parseReview(kind, text) {
  const v = /^\*\*Verdict\*\*:[ \t]*(.+?)[ \t]*$/m.exec(text)?.[1] ?? "";
  if (kind === "verify") return /^(PASS|FAIL|BLOCKED)$/.test(v) ? { verdict: v } : null;
  if (!/^(Approve|Approve with nits|Changes requested|Blocked)$/.test(v)) return null;
  const section = /^## Blockers[ \t]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(text)?.[1] ?? "";
  return { verdict: v, blockers: [...section.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim()) };
}

function reviewEvidence(repo, own, branch, pulls, win, deps) {
  const [from, to] = [localDay(win.start), localDay(win.end)];
  let seen;
  try {
    const refs = [branch, ...pulls.filter((p) => p.open || (p.merged && p.merged >= win.start && p.merged <= win.end)).map((p) => p.head)];
    const found = new Map();
    for (const ref of refs) {
      const tree = JSON.parse(deps.get(`repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`, "{truncated, files: [.tree[] | select(.type == \"blob\") | select(.path | test(\"^(docs|[.]workflow)/reviews/\")) | {path, sha}]}"));
      if (tree.truncated) throw new LoopError("the file tree is too large to read whole.");
      for (const f of tree.files) if (classifyReviewFile(f.path)) found.set(f.path, [...(found.get(f.path) ?? []), { ref, sha: f.sha }]);
    }
    const when = (f, at) => deps.get(`repos/${repo}/commits?sha=${encodeURIComponent(at.ref)}&path=${encodeURIComponent(f)}&per_page=1`, ".[0].commit.committer.date").trim();
    seen = [...found].map(([file, at]) => {
      const c = classifyReviewFile(file);
      // Whole days, end day left for the next run, so no file counts twice.
      if (c.kind === "test" || c.date < from || c.date >= to) return { file, ...c };
      const pick = new Set(at.map((x) => x.sha)).size === 1 ? at[0] : at.map((x) => ({ ...x, date: when(file, x) })).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
      const blob = JSON.parse(deps.get(`repos/${repo}/git/blobs/${pick.sha}`, "{content}"));
      return { file, ...c, inWindow: true, parsed: parseReview(c.kind, Buffer.from(blob.content, "base64").toString("utf8")) };
    });
  } catch (e) {
    return { verify: NO(oneLine(e)), review: NO(oneLine(e)) };
  }
  const of = (kind) => {
    const all = seen.filter((f) => f.kind === kind);
    if (!all.length) return NO(`no ${kind} files`);
    const inWin = all.filter((f) => f.inWindow);
    const good = inWin.filter((f) => f.parsed);
    const bad = inWin.filter((f) => !f.parsed);
    const verdicts = {};
    for (const f of good) verdicts[f.parsed.verdict] = (verdicts[f.parsed.verdict] ?? 0) + 1;
    return {
      count: good.length,
      verdicts,
      ...(kind === "review" ? { blockers: good.reduce((n, f) => n + f.parsed.blockers.length, 0) } : {}),
      unparsed: own ? bad.map((f) => f.file) : bad.length,
      ...(own ? { files: good.map((f) => ({ file: f.file, ...f.parsed })) } : {}),
    };
  };
  return { verify: of("verify"), review: of("review") };
}

function retroProject(row, login, win, deps) {
  const own = isOwn(row.repo, login);
  let branch, pulls;
  try {
    branch = deps.get(`repos/${row.repo}`, ".default_branch").trim();
    pulls = deps.list(`repos/${row.repo}/pulls?state=all&per_page=100`, ".[] | {number, state, created: .created_at, merged: .merged_at, mergeSha: .merge_commit_sha, branch: .head.ref, head: .head.sha}")
      .map((p) => ({ ...p, open: p.state === "open" }));
  } catch (e) {
    const no = NO(oneLine(e));
    return { project: row.project, repo: row.repo, own, gate: no, verify: no, review: no };
  }
  return {
    project: row.project, repo: row.repo, own,
    gate: gateEvidence(row.repo, own, branch, pulls, win, deps),
    ...reviewEvidence(row.repo, own, branch, pulls, win, deps),
  };
}

// ---------- nightly evidence ----------

/** The commit the night starts from (AC-5). `from` is null for the empty tree. */
export function nightlyStart(dir, record, now) {
  const before = (ms) => git(["rev-list", "-1", "--first-parent", `--before=${iso(now.getTime() - ms)}`, "HEAD"], dir).trim() || null;
  if (!record) return { from: before(DAY) };
  const known = /^[0-9a-f]{40}$/.test(record.sha) && gitOk(["cat-file", "-e", `${record.sha}^{commit}`], dir);
  if (!known || !gitOk(["merge-base", "--is-ancestor", record.sha, "HEAD"], dir)) {
    return { from: before(DAY), alert: "The recorded commit is not in the default branch history (rewritten). Only the last 24 hours were covered." };
  }
  const limit = CAPS.nightlyDays * DAY;
  if (now.getTime() - Date.parse(record.recordedAt) <= limit) return { from: record.sha };
  const from = before(limit);
  // A quiet stretch leaves nothing uncovered.
  if (!from || gitOk(["merge-base", "--is-ancestor", from, record.sha], dir)) return { from: record.sha };
  return { from, gap: { fromCommit: record.sha.slice(0, 7), toCommit: from.slice(0, 7), recordedAt: record.recordedAt } };
}

const EMPTY_FROM = (from) => from ?? EMPTY_TREE;

export function collectDiff(dir, from, config) {
  const flags = ["--no-renames", "--no-ext-diff", "--no-textconv", "--no-color"];
  const base = EMPTY_FROM(from);
  const files = git(["diff", "--numstat", "-z", ...flags, base, "HEAD"], dir).split("\0").filter(Boolean).map((l) => {
    const [add, del, ...name] = l.split("\t");
    return { file: name.join("\t"), binary: add === "-", lines: add === "-" ? 0 : Number(add) + Number(del) };
  });
  const attrs = files.length
    ? spawnSync("git", ["check-attr", "-z", "--stdin", "linguist-generated"], { cwd: dir, env: ENV, encoding: "utf8", input: files.map((f) => f.file).join("\0") + "\0" }).stdout.split("\0")
    : [];
  const marked = new Set();
  for (let i = 0; i + 2 < attrs.length; i += 3) if (attrs[i + 2] === "set" || attrs[i + 2] === "true") marked.add(attrs[i]);

  const blocked = config.areas.filter((a) => a.onTouch === "block");
  const inArea = (a, file) => matchesAny(a.paths, file) && !matchesAny(a.except, file);
  const order = (file) => { const i = config.areas.findIndex((a) => inArea(a, file)); return i < 0 ? config.areas.length : i; };
  const left = [];
  const keep = [];
  for (const f of files) {
    if (f.binary) left.push({ file: f.file, why: "binary" });
    else if (marked.has(f.file) || matchesAny(GENERATED, f.file)) left.push({ file: f.file, lines: f.lines, why: "lockfile or generated" });
    else if (blocked.some((a) => inArea(a, f.file))) left.push({ file: f.file, lines: f.lines, why: "possible secret, content withheld" });
    else keep.push({ ...f, order: order(f.file) });
  }
  keep.sort((a, b) => a.order - b.order || (a.file < b.file ? -1 : 1));
  let used = 0;
  const reviewed = [];
  for (const f of keep) {
    if (used + f.lines > CAPS.lines) { left.push({ file: f.file, lines: f.lines, why: "over the line cap" }); continue; }
    used += f.lines;
    reviewed.push({ file: f.file, lines: f.lines, area: config.areas[f.order]?.id ?? null });
  }
  const secret = blocked.flatMap((a) => a.content.map((c) => ({ ...c, except: a.except })));
  const redact = (file, l) => {
    if (!/^[ +-]/.test(l)) return l;
    if (secret.some((r) => !matchesAny(r.except, file) && r.regex.test(l.slice(1)))) return `${l[0]}[line withheld: possible secret]`;
    return l.length > CAPS.lineChars ? `${l.slice(0, CAPS.lineChars)} [cut]` : l;
  };
  const text = reviewed.map((f) => git(["diff", ...flags, base, "HEAD", "--", `:(literal)${f.file}`], dir).split("\n").map((l) => redact(f.file, l)).join("\n")).join("");
  return { text, changedLines: used, reviewed, notReviewed: left };
}

function rulesAt(dir, from) {
  const { config } = loadConfig(dir, undefined, from ?? undefined);
  return config ?? compileConfig({ version: 1, approvers: ["engineer"], areas: BUILT_IN_AREAS });
}

function nightlyProject(row, record, runDir, now, deps) {
  const slug = row.repo.replace("/", "__");
  const dir = path.join(runDir, "repos", slug);
  git(["clone", "-q", "--single-branch", deps.url(row.repo), dir]);
  const head = git(["rev-parse", "HEAD"], dir).trim();
  const s = nightlyStart(dir, record, now);
  const out = { project: row.project, repo: row.repo, from: s.from ?? "empty tree", head, ...(s.alert ? { alert: s.alert } : {}), ...(s.gap ? { uncoveredGap: s.gap } : {}) };
  if (s.from === head) return { ...out, newCommits: false };
  let gateFrom = s.from;
  if (!gateFrom) {
    gateFrom = git(["rev-list", "--max-parents=0", "HEAD"], dir).trim().split("\n").pop();
    out.alert = `Young repo: everything was read, but the root commit ${gateFrom.slice(0, 7)} was not checked by the gate.`;
  }
  const gate = gateCheck(dir, { base: gateFrom });
  const d = collectDiff(dir, s.from, rulesAt(dir, gateFrom));
  const diffFile = path.join(runDir, "diffs", `${slug}.diff`);
  writeFileSync(diffFile, d.text);
  return {
    ...out,
    newCommits: true,
    commits: git(["log", "--format=%h %an: %s", s.from ? `${s.from}..HEAD` : "HEAD"], dir).trim().split("\n").slice(0, 100),
    secretFindings: gate.areas.filter((a) => a.state === "blocked").flatMap((a) => a.findings.map((f) => ({ area: a.id, ...f }))),
    diffFile,
    changedLines: d.changedLines,
    reviewed: d.reviewed,
    notReviewed: d.notReviewed,
  };
}

function nightly(rows, login, state, runDir, now, deps) {
  const qualifying = nightlyRows(rows, login);
  const record = (r) => state?.heads?.[r.repo] ?? null;
  const sorted = [...qualifying].sort((a, b) => (record(a)?.recordedAt ?? "").localeCompare(record(b)?.recordedAt ?? ""));
  mkdirSync(path.join(runDir, "repos"), { recursive: true });
  mkdirSync(path.join(runDir, "diffs"), { recursive: true });
  const projects = [];
  const heads = {};
  const leftOut = [];
  let read = 0;
  for (const r of sorted) {
    try {
      const remote = git(["ls-remote", deps.url(r.repo), "HEAD"]).split(/\s+/)[0];
      if (!remote) throw new LoopError("the repo has no default branch head.");
      if (record(r)?.sha === remote) {
        heads[r.repo] = { sha: remote, recordedAt: iso(now) };
        projects.push({ project: r.project, repo: r.repo, head: remote, newCommits: false });
        continue;
      }
      if (read >= CAPS.projects) { leftOut.push(r.repo); continue; }
      read++;
      const p = nightlyProject(r, record(r), runDir, now, deps);
      if (!p.newCommits) read--;
      heads[r.repo] = { sha: p.head, recordedAt: iso(now) };
      projects.push(p);
    } catch (e) {
      if (!(e instanceof LoopError) && !(e instanceof GateError)) throw e;
      projects.push({ project: r.project, repo: r.repo, error: oneLine(e) });
    }
  }
  return { projects, heads, leftOut, quiet: !projects.some((p) => p.newCommits || p.error || p.alert) && !leftOut.length };
}

// ---------- commands ----------

export function start({ loop, run: runArg, cwd, state: stateArg, registry }, deps = realDeps()) {
  if (loop !== "nightly" && loop !== "retro") throw new LoopError('the loop must be "nightly" or "retro".');
  if (!runArg || !cwd) throw new LoopError("--run and --cwd are required.");
  const runDir = path.resolve(runArg);
  if (existsSync(runDir) && readdirSync(runDir).length) throw new LoopError("the run folder must be empty.");
  mkdirSync(runDir, { recursive: true });
  const stateDir = path.resolve(stateArg ?? defaultState());
  const regFile = registry ?? path.join(path.dirname(realpathSync(fileURLToPath(import.meta.url))), "../docs/portfolio/registry.md");
  if (!existsSync(regFile)) throw new LoopError(`registry not found: ${regFile}`);
  const rows = parseRegistry(readFileSync(regFile, "utf8"));
  const login = deps.get("user", ".login").trim();
  const now = deps.now();
  const state = loadState(stateDir, loop);
  const live = nightlyRows(rows, login);
  const covered = loop === "nightly" ? live : rows.filter((r) => r.repo && !["planned", "archived"].includes(r.status));
  const print = fingerprint(covered.map((r) => r.repo), path.resolve(cwd), deps);
  const common = { loop, startedAt: iso(now), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, liveProjects: live.length };
  let evidence;
  let heads = {};
  if (loop === "nightly") {
    const n = nightly(rows, login, state, runDir, now, deps);
    heads = n.heads;
    evidence = { ...common, quiet: n.quiet, projects: n.projects, leftOut: n.leftOut, skippedRows: rows.filter((r) => !live.includes(r)).map((r) => r.project), caps: CAPS };
  } else {
    const window = retroWindow(state, now);
    const projects = covered.map((r) => retroProject(r, login, window, deps));
    const reports = existsSync(path.join(stateDir, "reports")) ? readdirSync(path.join(stateDir, "reports")).filter((f) => /^retro-\d{8}T\d{6}Z\.md$/.test(f)).sort() : [];
    const active = (p) => p.gate.count || (Array.isArray(p.gate.approvals) ? p.gate.approvals.length : p.gate.approvals?.count) || [p.verify, p.review].some((s) => s.count || (Array.isArray(s.unparsed) ? s.unparsed.length : s.unparsed));
    evidence = {
      ...common,
      window,
      reviewDays: { from: localDay(window.start), before: localDay(window.end) },
      quiet: !projects.some(active),
      previousReport: reports.length ? path.join(stateDir, "reports", reports.at(-1)) : null,
      projects,
    };
  }
  writeJson(path.join(runDir, "start.json"), { version: 1, ...common, stateDir, cwd: path.resolve(cwd), repos: covered.map((r) => r.repo), fingerprint: print, heads, previousHeads: state?.heads ?? {} });
  writeJson(path.join(runDir, "evidence.json"), evidence);
  return evidence;
}

function loadRun(runArg) {
  const f = path.join(path.resolve(runArg ?? ""), "start.json");
  if (!runArg || !existsSync(f)) throw new LoopError("no started run in --run.");
  return readJson(f);
}

export function checkRun({ run: runArg }, deps = realDeps()) {
  const s = loadRun(runArg);
  const r = compareFingerprints(s.fingerprint, fingerprint(s.repos, s.cwd, deps));
  writeJson(path.join(path.resolve(runArg), "check.json"), r);
  return r;
}

export function finish({ run: runArg, report }, deps = realDeps()) {
  const s = loadRun(runArg);
  if (!existsSync(path.join(path.resolve(runArg), "check.json"))) throw new LoopError("run check before finish.");
  if (!report || !existsSync(report) || !readFileSync(report, "utf8").trim()) throw new LoopError("the report is missing or empty.");
  const at = deps.now();
  const reports = path.join(s.stateDir, "reports");
  const target = path.join(reports, `${s.loop}-${stamp(at)}.md`);
  try {
    mkdirSync(reports, { recursive: true });
    writeFileSync(target, readFileSync(report), { flag: "wx", mode: 0o600 });
    writeJson(path.join(s.stateDir, `${s.loop}.json`), {
      version: 1, loop: s.loop, finishedAt: iso(at), windowEnd: s.startedAt, heads: { ...s.previousHeads, ...s.heads },
    });
  } catch (e) {
    throw new LoopError(`could not save: ${oneLine(e)}`);
  }
  return { saved: target };
}

function main(argv) {
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const args = { run: opt("run"), cwd: opt("cwd"), state: opt("state"), registry: opt("registry"), report: opt("report") };
  try {
    if (argv[0] === "start") console.log(JSON.stringify(start({ ...args, loop: argv[1] }), null, 2));
    else if (argv[0] === "check") {
      const r = checkRun(args);
      console.log(r.differences.length || r.failed.length ? JSON.stringify(r, null, 2) : "clean");
      return r.failed.length ? 3 : r.differences.length ? 1 : 0;
    } else if (argv[0] === "finish") console.log(JSON.stringify(finish(args)));
    else throw new LoopError("use start, check, or finish.");
    return 0;
  } catch (e) {
    if (!(e instanceof LoopError)) throw e;
    console.error(`loop-collect: ${e.message}`);
    return 3;
  }
}

const invoked = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invoked) process.exitCode = main(process.argv.slice(2));
