#!/usr/bin/env node
// zd-gate: the Zero Dawn risk gate (spec docs/specs/0003-risk-gate.md).
// Reads every commit since the merge base and checks it against .zd/risk.json
// (or built in defaults). Not an AI: it only reads git and prints.
//
//   zd-gate [base] [--json] [--risk <path>]   check the current branch
//   zd-gate init [--force-ci]                 enroll this repo
//
// Exit: 0 clear · 1 needs an approval · 2 blocked · 3 error.

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class GateError extends Error {}

export const TRAILER_KEY = "Risk-approved";
const TRAILER_RE = /^Risk-approved:\s*([a-z0-9][a-z0-9-]*)\s*\((.+?)\)\s*$/gim;
const RISK_FILE = ".zd/risk.json";

// ---------- default areas ----------

const SECRETS = {
  id: "secrets",
  name: "Secrets, keys, and tokens",
  why: "A secret committed once stays in git history forever, even if a later commit deletes it.",
  onTouch: "block",
  fix: "Rotate the key at its provider, move the value to an environment variable, then rewrite this branch's history before merging (ask the engineer before any force push).",
  paths: [".env", ".env.*", "*.pem", "*.key", "*.p12", "*.pfx", "id_rsa*", "id_ed25519*", "*credentials*.json", "service-account*.json"],
  except: [".env.example", ".env.sample", ".env.template", "*.pub"],
  content: [
    { name: "private key block", pattern: "-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----" },
    { name: "cloud access key id", pattern: "\\b(?:AKIA|ASIA)[0-9A-Z]{16}\\b" },
    { name: "git host token", pattern: "\\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,}|glpat-[A-Za-z0-9_-]{20,})" },
    { name: "payment live secret key", pattern: "\\b(?:sk|rk)_live_[0-9A-Za-z]{24,}" },
    { name: "chat app token", pattern: "\\bxox[abposr]-[0-9A-Za-z-]{10,}" },
    { name: "cloud api key", pattern: "\\bAIza[0-9A-Za-z_-]{35}\\b" },
    { name: "AI provider key", pattern: "\\bsk-(?:ant|proj|svcacct)-[A-Za-z0-9_-]{20,}" },
    { name: "password inside a connection URL", pattern: "\\b[a-z][a-z0-9+.-]*://[^\\s:/@'\"]+:[^\\s:/@'\"$<{]{3,}@" },
    { name: "hard coded credential", pattern: "\\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\\b[\"']?\\s*[:=]\\s*[\"'][^\"'\\s]{8,}[\"']", flags: "i" },
  ],
};

const WORKFLOW = {
  id: "workflow",
  name: "Workflow rules",
  why: "Changing the rules changes what every other check enforces, so it waits for the engineer.",
  onTouch: "approve",
  paths: ["AGENTS.md", "CLAUDE.md", ".claude/", ".zd/", ".github/workflows/", ".githooks/"],
};

const AUTH = {
  id: "auth",
  name: "Sign in, sessions, and permissions",
  why: "A mistake here lets people in where they should not be, or locks everyone out.",
  onTouch: "approve",
  paths: ["auth/", "login/", "session/", "sessions/", "permissions/", "*auth*.*", "*login*.*", "*session*.*", "*permission*.*", "middleware.*"],
  except: ["*.md"],
};

const BILLING = {
  id: "billing",
  name: "Billing and payments",
  why: "A mistake here charges the wrong amount or stops charging at all.",
  onTouch: "approve",
  paths: ["billing/", "payment/", "payments/", "checkout/", "subscriptions/", "invoices/", "*billing*.*", "*payment*.*", "*checkout*.*", "*stripe*.*", "*subscription*.*", "*invoice*.*"],
  except: ["*.md"],
};

const PROD_DB = {
  id: "prod-db",
  name: "Production database",
  why: "Migrations and destructive SQL change customer data, and not every change can be undone.",
  onTouch: "approve",
  paths: ["migrations/", "migrate/", "drizzle/", "schema.prisma", "schema.sql"],
  except: ["*.md"],
  content: [
    { name: "destructive SQL", pattern: "\\b(?:DROP\\s+(?:TABLE|DATABASE|SCHEMA|COLUMN)|TRUNCATE\\s+TABLE|DELETE\\s+FROM\\s+[\\w.\"]+\\s*;)", flags: "i" },
  ],
};

/** Areas used when a project has no risk file yet (AC-6). */
export const BUILT_IN_AREAS = [SECRETS, WORKFLOW];
/** Areas `zd-gate init` writes into a new risk file (AC-9). */
export const INIT_AREAS = [SECRETS, WORKFLOW, AUTH, BILLING, PROD_DB];

// ---------- helpers ----------

function run(cmd, args, cwd, { allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  if (r.error) throw new GateError(`${cmd} could not run: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) throw new GateError(`${cmd} ${args.join(" ")} failed: ${(r.stderr || "").trim()}`);
  return r;
}

const git = (args, cwd, opts) => run("git", ["-c", "core.quotepath=off", ...args], cwd, opts).stdout;

function refExists(ref, cwd) {
  return run("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], cwd, { allowFail: true }).status === 0;
}

/** gitignore style: "dir/" matches everything under it, a pattern without "/" matches at any depth, a leading "/" anchors to the root. */
export function normalizeGlob(pattern) {
  let p = pattern.trim();
  if (p.endsWith("/")) p += "**";
  if (p.startsWith("/")) return p.slice(1);
  if (!p.slice(0, -1).includes("/") && !p.startsWith("**")) return `**/${p}`;
  return p;
}

function checkRuntime(cwd) {
  if (typeof path.matchesGlob !== "function") throw new GateError("Node 22 or newer is required (path.matchesGlob is missing).");
  const v = /git version (\d+)\.(\d+)/.exec(git(["--version"], cwd));
  if (!v || Number(v[1]) < 2 || (Number(v[1]) === 2 && Number(v[2]) < 36)) throw new GateError("git 2.36 or newer is required (for --diff-merges=remerge).");
  if (run("git", ["rev-parse", "--git-dir"], cwd, { allowFail: true }).status !== 0) throw new GateError("This folder is not a git repository.");
}

// ---------- risk file ----------

function str(v, where) {
  if (typeof v !== "string" || !v.trim()) throw new GateError(`${where} must be a non empty string.`);
  return v.trim();
}
function list(v, where) {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new GateError(`${where} must be a list.`);
  return v;
}

/** Validate and compile a risk config object into matchers. */
export function compileConfig(raw) {
  if (!raw || typeof raw !== "object") throw new GateError("risk file must be a JSON object.");
  if (raw.version !== 1) throw new GateError(`risk file version must be 1 (got ${JSON.stringify(raw.version)}).`);
  const approvers = list(raw.approvers, "approvers").map((a, i) => str(a, `approvers[${i}]`));
  if (approvers.length === 0) throw new GateError("approvers must name at least one person.");
  const areas = list(raw.areas, "areas");
  if (areas.length === 0) throw new GateError("areas must have at least one area.");
  const ids = new Set();
  const compiled = areas.map((a, i) => {
    const w = `areas[${i}]`;
    if (!a || typeof a !== "object") throw new GateError(`${w} must be an object.`);
    const id = str(a.id, `${w}.id`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new GateError(`${w}.id "${id}" must be lowercase letters, digits, and dashes.`);
    if (ids.has(id)) throw new GateError(`area "${id}" appears twice.`);
    ids.add(id);
    if (a.onTouch !== "block" && a.onTouch !== "approve") throw new GateError(`${w}.onTouch must be "block" or "approve".`);
    const paths = list(a.paths, `${w}.paths`).map((g, j) => normalizeGlob(str(g, `${w}.paths[${j}]`)));
    const except = list(a.except, `${w}.except`).map((g, j) => normalizeGlob(str(g, `${w}.except[${j}]`)));
    const content = list(a.content, `${w}.content`).map((r, j) => {
      const rw = `${w}.content[${j}]`;
      const name = str(r?.name, `${rw}.name`);
      try {
        return { name, regex: new RegExp(str(r?.pattern, `${rw}.pattern`), typeof r?.flags === "string" ? r.flags.replace(/g/g, "") : "") };
      } catch (e) {
        throw new GateError(`${rw}.pattern is not a valid regular expression: ${e.message}`);
      }
    });
    if (paths.length === 0 && content.length === 0) throw new GateError(`${w} needs "paths" or "content".`);
    const areaApprovers = a.approvers === undefined ? approvers : list(a.approvers, `${w}.approvers`).map((p, j) => str(p, `${w}.approvers[${j}]`));
    for (const p of areaApprovers) if (!approvers.includes(p)) throw new GateError(`${w}.approvers names "${p}", who is not in the top level approvers.`);
    if (a.onTouch === "block" && typeof a.fix !== "string") throw new GateError(`${w} blocks, so it needs a "fix".`);
    return {
      id,
      name: str(a.name, `${w}.name`),
      why: str(a.why, `${w}.why`),
      onTouch: a.onTouch,
      fix: a.fix,
      approvers: areaApprovers,
      paths,
      except,
      content,
    };
  });
  return { approvers, areas: compiled };
}

export function gitUserName(cwd) {
  return git(["config", "user.name"], cwd, { allowFail: true }).trim();
}

/** Load .zd/risk.json, or the built in defaults with a warning (AC-6). */
export function loadConfig(cwd, riskPath) {
  const p = path.resolve(cwd, riskPath ?? RISK_FILE);
  if (existsSync(p)) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(p, "utf8"));
    } catch (e) {
      throw new GateError(`${riskPath ?? RISK_FILE} is not valid JSON: ${e.message}`);
    }
    return { config: compileConfig(raw), warnings: [] };
  }
  if (riskPath) throw new GateError(`risk file not found: ${riskPath}`);
  const name = gitUserName(cwd) || "the engineer";
  return {
    config: compileConfig({ version: 1, approvers: [name], areas: BUILT_IN_AREAS }),
    warnings: [`No ${RISK_FILE} here, so the built in defaults (secrets, workflow) apply. Run "zd-gate init" to enroll this project.`],
  };
}

// ---------- git reading ----------

function parseAddedLines(patch) {
  const out = [];
  let file = "";
  let n = 0;
  for (const l of patch.split("\n")) {
    if (l.startsWith("+++ ")) file = l === "+++ /dev/null" ? "" : l.slice(6);
    else if (l.startsWith("@@")) n = Number(/\+(\d+)/.exec(l)?.[1] ?? 0);
    else if (file && l.startsWith("+")) out.push({ file, line: n++, text: l.slice(1) });
  }
  return out;
}

function splitByCommit(output) {
  const map = new Map();
  for (const block of output.split("\x1e")) {
    const nl = block.indexOf("\n");
    const hash = (nl < 0 ? block : block.slice(0, nl)).trim();
    if (hash) map.set(hash, nl < 0 ? "" : block.slice(nl + 1));
  }
  return map;
}

function resolveBase(cwd, baseArg) {
  if (baseArg) {
    if (!refExists(baseArg, cwd)) throw new GateError(`base "${baseArg}" does not exist here.`);
    return baseArg;
  }
  const base = ["origin/main", "origin/master", "main", "master"].find((r) => refExists(r, cwd));
  if (!base) throw new GateError('no base found (tried origin/main, origin/master, main, master). Pass one: zd-gate <base>');
  return base;
}

// ---------- the check ----------

/** Run the gate. Returns the result object; never writes. */
export function check(cwd, { base: baseArg, riskPath } = {}) {
  checkRuntime(cwd);
  const { config, warnings } = loadConfig(cwd, riskPath);
  const base = resolveBase(cwd, baseArg);
  const mb = run("git", ["merge-base", base, "HEAD"], cwd, { allowFail: true });
  if (mb.status !== 0) {
    const shallow = git(["rev-parse", "--is-shallow-repository"], cwd).trim() === "true";
    throw new GateError(shallow
      ? `no merge base with ${base}: this is a shallow clone. Fetch full history (in CI: actions/checkout with fetch-depth: 0).`
      : `no merge base between ${base} and HEAD.`);
  }
  const mergeBase = mb.stdout.trim();
  const range = `${mergeBase}..HEAD`;
  const diffFlags = ["--no-renames", "--no-ext-diff", "--no-color", "--diff-merges=remerge"];

  // Newest first.
  const commits = git(["log", "--format=%H%x1f%B%x1e", range], cwd)
    .split("\x1e").map((b) => b.trim()).filter(Boolean)
    .map((b) => {
      const [hash, body = ""] = b.split("\x1f");
      const approvals = [...body.matchAll(TRAILER_RE)].map((m) => ({ area: m[1].toLowerCase(), name: m[2].trim() }));
      return { hash, short: hash.slice(0, 7), approvals };
    });
  const filesBy = splitByCommit(git(["log", "--name-only", ...diffFlags, "--format=%x1e%H", range], cwd));
  const linesBy = splitByCommit(git(["log", "-p", "--unified=0", ...diffFlags, "--format=%x1e%H", range], cwd));
  const finalTree = new Set(
    parseAddedLines(git(["diff", "--unified=0", "--no-renames", "--no-ext-diff", "--no-color", `${mergeBase}...HEAD`], cwd))
      .map((a) => `${a.file}\n${a.text}`),
  );

  const matches = (globs, file) => globs.some((g) => path.matchesGlob(file, g));
  const areas = [];
  for (const area of config.areas) {
    const findings = [];
    const seen = new Set();
    let lastTouch = -1;
    commits.forEach((c, i) => {
      const before = findings.length;
      const add = (f) => {
        const key = `${f.commit} ${f.file} ${f.line ?? ""} ${f.rule}`;
        if (!seen.has(key)) { seen.add(key); findings.push(f); }
      };
      for (const file of (filesBy.get(c.hash) ?? "").split("\n").map((l) => l.trim()).filter(Boolean)) {
        if (matches(area.paths, file) && !matches(area.except, file)) add({ commit: c.short, file, rule: "guarded path" });
      }
      if (area.content.length) {
        for (const a of parseAddedLines(linesBy.get(c.hash) ?? "")) {
          if (matches(area.except, a.file)) continue;
          const rule = area.content.find((r) => r.regex.test(a.text));
          if (rule) add({ commit: c.short, file: a.file, line: a.line, rule: rule.name, stillInFinalTree: finalTree.has(`${a.file}\n${a.text}`) });
        }
      }
      if (findings.length > before && lastTouch === -1) lastTouch = i;
    });
    if (findings.length === 0) continue;

    let approvedBy;
    if (area.onTouch === "approve") {
      for (let i = 0; i <= lastTouch && !approvedBy; i++) {
        const ok = commits[i].approvals.find((a) => a.area === area.id && area.approvers.some((n) => n.toLowerCase() === a.name.toLowerCase()));
        if (ok) approvedBy = { name: ok.name, commit: commits[i].short };
      }
    }
    areas.push({
      id: area.id,
      name: area.name,
      state: area.onTouch === "block" ? "blocked" : approvedBy ? "approved" : "needs-ok",
      why: area.why,
      ...(area.onTouch === "block" ? { fix: area.fix } : {}),
      approvers: area.approvers,
      ...(approvedBy ? { approvedBy } : {}),
      findings,
    });
  }
  const code = areas.some((a) => a.state === "blocked") ? 2 : areas.some((a) => a.state === "needs-ok") ? 1 : 0;
  return { base, commits: commits.length, areas, warnings, code };
}

export function approvalCommand(area) {
  const name = area.approvers.length === 1 ? area.approvers[0] : "<name>";
  return `git commit --allow-empty -m "Risk approval" --trailer "${TRAILER_KEY}: ${area.id} (${name})"`;
}

export function formatReport(r) {
  const out = [`zd-gate · ${r.commits} commit(s) since ${r.base}`, ""];
  if (r.commits === 0) out.push("No new commits. Nothing to check.", "");
  else if (r.areas.length === 0) out.push("Nothing guarded was touched.", "");
  for (const a of r.areas) {
    const label = { blocked: "BLOCKED", "needs-ok": "NEEDS OK", approved: "approved" }[a.state];
    out.push(`${label}  ${a.id} · ${a.name}`);
    if (a.state !== "approved") out.push(`  Why: ${a.why}`);
    for (const f of a.findings) {
      const where = f.line ? `${f.file}:${f.line}` : f.file;
      const note = f.stillInFinalTree === false ? " (removed later, still in history)" : "";
      out.push(`  - ${f.commit} ${where}: ${f.rule}${note}`);
    }
    if (a.state === "blocked") out.push(`  Fix: ${a.fix}`);
    if (a.state === "needs-ok") {
      out.push(`  Who may approve: ${a.approvers.join(", ")}`);
      out.push(`  After their yes: ${approvalCommand(a)}`);
    }
    if (a.approvedBy) out.push(`  Approved by ${a.approvedBy.name} in ${a.approvedBy.commit}`);
    out.push("");
  }
  for (const w of r.warnings) out.push(`Warning: ${w}`);
  out.push(["Result: clear.", "Result: STOP. An approval is missing.", "Result: BLOCKED. Fix before merging."][r.code]);
  return out.join("\n");
}

/** GitHub Actions job summary: every area that passed by trailer, so a forged one is visible (AC-10). */
export function jobSummary(r) {
  const lines = ["## zd-gate", "", `${r.commits} commit(s) since \`${r.base}\` · result code ${r.code}`, ""];
  const approved = r.areas.filter((a) => a.approvedBy);
  if (approved.length) {
    lines.push("| Area | Approved by | Commit |", "|---|---|---|");
    for (const a of approved) lines.push(`| ${a.id} | ${a.approvedBy.name} | ${a.approvedBy.commit} |`);
  } else lines.push("No area passed by approval trailer.");
  for (const a of r.areas.filter((x) => x.state !== "approved")) lines.push(`- **${a.state}**: ${a.id} (${a.findings.length} finding(s))`);
  return lines.join("\n") + "\n";
}

// ---------- init ----------

function zeroDawnRoot() {
  return path.resolve(path.dirname(realpathSync(fileURLToPath(import.meta.url))), "..");
}

export function workflowYaml({ selfHosted, repo, sha }) {
  const fetchGate = selfHosted ? "" : `      - uses: actions/checkout@v4
        with:
          repository: ${repo}
          ref: ${sha}
          path: .zd-gate
`;
  const script = selfHosted ? "scripts/zd-gate.mjs" : ".zd-gate/scripts/zd-gate.mjs";
  return `# Managed by zd-gate init (Zero Dawn spec 0003). Changes here are guarded by the workflow area.
name: zd-gate
on:
  pull_request:
permissions:
  contents: read
jobs:
  zd-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
${fetchGate}      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: node ${script} "origin/\${{ github.base_ref }}"
`;
}

function ensureRuleset(cwd, log) {
  const gh = (args, input) => spawnSync("gh", args, { cwd, encoding: "utf8", input });
  const view = gh(["repo", "view", "--json", "nameWithOwner,owner,viewerPermission"]);
  if (view.error || view.status !== 0) return log(`Skipped the required check: gh could not read this repo (${(view.stderr || view.error?.message || "").trim()}).`);
  const repo = JSON.parse(view.stdout);
  const me = gh(["api", "user", "-q", ".login"]).stdout.trim();
  if (repo.owner.login !== me) return log(`Skipped the required check: ${repo.nameWithOwner} belongs to ${repo.owner.login}, not you. Ask the owner to require the "zd-gate" check.`);
  if (repo.viewerPermission !== "ADMIN") return log("Skipped the required check: you are not an admin of this repo.");
  const existing = gh(["api", `repos/${repo.nameWithOwner}/rulesets`]);
  if (existing.status === 0 && JSON.parse(existing.stdout || "[]").some((r) => r.name === "zd-gate")) return log('Required check already set (ruleset "zd-gate").');
  const body = JSON.stringify({
    name: "zd-gate",
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: [{ type: "required_status_checks", parameters: { strict_required_status_checks_policy: false, required_status_checks: [{ context: "zd-gate" }] } }],
  });
  const made = gh(["api", "-X", "POST", `repos/${repo.nameWithOwner}/rulesets`, "--input", "-"], body);
  if (made.status !== 0) return log(`Skipped the required check: GitHub refused the ruleset (${(made.stderr || made.stdout).trim().split("\n")[0]}). Private repos on the free plan cannot require checks.`);
  log(`Required check set: ruleset "zd-gate" on ${repo.nameWithOwner}'s default branch.`);
}

export function init(cwd, { forceCi = false, protect = true, log = console.log } = {}) {
  checkRuntime(cwd);
  const top = git(["rev-parse", "--show-toplevel"], cwd).trim();
  const zd = zeroDawnRoot();
  const selfHosted = realpathSync(top) === realpathSync(zd);

  const riskFile = path.join(top, RISK_FILE);
  if (existsSync(riskFile)) log(`Kept ${RISK_FILE} (it already exists).`);
  else {
    const name = gitUserName(top);
    if (!name) throw new GateError('git user.name is not set, so there is no approver to write. Run: git config user.name "Your Name"');
    mkdirSync(path.dirname(riskFile), { recursive: true });
    writeFileSync(riskFile, JSON.stringify({ version: 1, approvers: [name], areas: INIT_AREAS }, null, 2) + "\n");
    log(`Wrote ${RISK_FILE} (approver: ${name}).`);
  }

  const wf = path.join(top, ".github/workflows/zd-gate.yml");
  if (existsSync(wf) && !forceCi) log("Kept .github/workflows/zd-gate.yml (it already exists; --force-ci rewrites it).");
  else {
    let repo, sha;
    if (!selfHosted) {
      sha = git(["rev-parse", "HEAD"], zd).trim();
      if (!git(["branch", "-r", "--contains", sha], zd).trim()) throw new GateError(`Zero Dawn commit ${sha.slice(0, 7)} is not pushed yet, so CI could not fetch it. Push Zero Dawn first.`);
      const url = git(["remote", "get-url", "origin"], zd).trim();
      repo = /github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/.exec(url)?.[1];
      if (!repo) throw new GateError(`Zero Dawn's origin is not a GitHub repo (${url}).`);
    }
    mkdirSync(path.dirname(wf), { recursive: true });
    writeFileSync(wf, workflowYaml({ selfHosted, repo, sha }));
    log(`Wrote .github/workflows/zd-gate.yml${selfHosted ? " (runs the gate from this checkout)" : ` (gate pinned to ${repo}@${sha.slice(0, 7)})`}.`);
  }
  if (protect) ensureRuleset(top, log);
}

// ---------- CLI ----------

function main(argv) {
  const json = argv.includes("--json");
  try {
    if (argv[0] === "init") {
      init(process.cwd(), { forceCi: argv.includes("--force-ci") });
      return 0;
    }
    if (argv.includes("--help") || argv.includes("-h")) {
      console.log("zd-gate [base] [--json] [--risk <path>]  check this branch\nzd-gate init [--force-ci]                enroll this repo");
      return 0;
    }
    const iRisk = argv.indexOf("--risk");
    const riskPath = iRisk >= 0 ? argv[iRisk + 1] : undefined;
    const base = argv.find((a, i) => !a.startsWith("--") && (iRisk < 0 || i !== iRisk + 1));
    const r = check(process.cwd(), { base, riskPath });
    console.log(json ? JSON.stringify(r, null, 2) : formatReport(r));
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, jobSummary(r));
    return r.code;
  } catch (e) {
    if (!(e instanceof GateError)) throw e;
    if (json) console.log(JSON.stringify({ error: e.message, code: 3 }));
    console.error(`zd-gate: ${e.message}`);
    return 3;
  }
}

const invoked = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invoked) process.exitCode = main(process.argv.slice(2));
