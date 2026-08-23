#!/usr/bin/env node
/**
 * CI deploy script: runs inside GitHub Actions.
 * - Verifies VERCEL_TOKEN
 * - Finds or creates the Vercel project for this repo
 * - Copies required env vars from an existing project if the target lacks them
 * - Deploys to production and prints the URL
 *
 * Secrets (token, env values) are never printed.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const TOKEN = process.env.VERCEL_TOKEN || "";
const TEAM_OVERRIDE = (process.env.VERCEL_TEAM || "").trim();
const PROJECT_OVERRIDE = (process.env.VERCEL_PROJECT || "").trim();
const REPO_NAME = (process.env.GITHUB_REPOSITORY || "wahaca9693/ZERO").split("/")[1].toLowerCase();

const REQUIRED_ENV_KEYS = ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "SESSION_SECRET"];
const API = "https://api.vercel.com";

const log = (m) => console.log(`[deploy] ${m}`);
const fail = (m) => { console.error(`[deploy] FAIL: ${m}`); process.exit(1); };

if (!TOKEN) {
  fail("VERCEL_TOKEN secret غير موجود. أضفه في: Settings → Secrets and variables → Actions → New repository secret");
}

const headers = () => ({ Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" });

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 400) }; }
  if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function run(cmd, args, opts = {}) {
  const argsSafe = args.map((a) => (typeof a === "string" && TOKEN && a === TOKEN ? "***" : a));
  log(`$ ${cmd} ${argsSafe.join(" ")}`);
  try {
    return execFileSync(cmd, args, { stdio: "inherit", ...opts });
  } catch (err) {
    let msg = String(err?.message || err);
    msg = msg.split(TOKEN).join("***");
    console.error(`[deploy] command failed: ${msg.slice(0, 500)}`);
    throw err;
  }
}

const cliArgs = (extra = []) => {
  const args = ["--token", TOKEN, ...extra];
  if (TEAM_OVERRIDE) args.push("--scope", TEAM_OVERRIDE);
  return args;
};

// ---------------------------------------------------------------- 1) auth
let user;
try {
  user = (await api("/v2/user")).user;
} catch (e) {
  fail(`توكن Vercel غير صالح أو منتهي → ${e.message}`);
}
log(`token OK — account: ${user.username} (${user.email || "no email"}), plan: ${user.plan || "?"}`);

// ---------------------------------------------------------------- 2) scope
let teamId = null;
let scope = user.username;
if (TEAM_OVERRIDE) {
  scope = TEAM_OVERRIDE;
  const teams = (await api("/v2/teams")).teams || [];
  const t = teams.find((x) => x.slug === TEAM_OVERRIDE || x.id === TEAM_OVERRIDE);
  if (t) teamId = t.id;
  log(`scope (override): ${TEAM_OVERRIDE} teamId=${teamId}`);
} else {
  const teams = (await api("/v2/teams")).teams || [];
  if (teams.length === 1) {
    teamId = teams[0].id;
    scope = teams[0].slug;
    log(`فريق واحد موجود — scope: ${teams[0].slug}`);
  } else if (teams.length > 1) {
    log(`عدة فرق موجودة (${teams.map((t) => t.slug).join(", ")}) — سيتم استخدام الحساب الشخصي. أضف secret اسمه VERCEL_TEAM لتحديد فريق.`);
  } else {
    log("لا توجد فرق — نشر على الحساب الشخصي.");
  }
}
const q = teamId ? `teamId=${teamId}` : "";
const withQ = (path) => (q ? `${path}${path.includes("?") ? "&" : "?"}${q}` : path);

// ---------------------------------------------------------------- 3) projects
const projects = [];
for (let skip = 0; ; skip += 100) {
  const data = await api(withQ(`/v9/projects?limit=100&skip=${skip}`));
  projects.push(...(data.projects || []));
  if ((data.projects || []).length < 100) break;
}
log(`المشاريع الموجودة (${projects.length}): ${projects.map((p) => p.name).join(", ") || "لا يوجد"}`);

async function envKeysOf(projectId) {
  try {
    const data = await api(withQ(`/v9/projects/${projectId}/env`));
    return (data.envs || []).map((e) => e.key);
  } catch {
    return [];
  }
}
const hasRequired = (keys) => REQUIRED_ENV_KEYS.every((k) => keys.includes(k));

// ---------------------------------------------------------------- 4) target selection
let target = null;
let mustCreate = false;

if (fs.existsSync(".vercel/project.json")) {
  try {
    const linked = JSON.parse(fs.readFileSync(".vercel/project.json", "utf8"));
    target = projects.find((p) => p.id === linked.projectId) || { name: linked.projectName, id: linked.projectId };
    log(`مشروع مربوط من .vercel/project.json: ${target.name}`);
  } catch { /* ignore */ }
}

if (!target && PROJECT_OVERRIDE) {
  target = projects.find((p) => p.id === PROJECT_OVERRIDE || p.name === PROJECT_OVERRIDE)
    || { name: PROJECT_OVERRIDE, id: PROJECT_OVERRIDE };
  log(`مشروع محدد عبر VERCEL_PROJECT: ${target.name}`);
}

if (!target && projects.length > 0) {
  const exact = projects.find((p) => p.name === REPO_NAME);
  if (exact) {
    target = exact;
    log(`وجدت مشروعًا بنفس اسم المستودع: ${exact.name}`);
  } else if (projects.length === 1) {
    target = projects[0];
    log(`مشروع واحد فقط في الحساب → النشر إليه: ${target.name}`);
  } else {
    const withEnvs = [];
    for (const p of projects) {
      const keys = await envKeysOf(p.id);
      if (hasRequired(keys)) withEnvs.push(p);
    }
    if (withEnvs.length === 1) {
      target = withEnvs[0];
      log(`مشروع واحد يحتوي متغيرات البيئة المطلوبة → النشر إليه: ${target.name}`);
    } else if (withEnvs.length > 1) {
      fail(`غموض: أكثر من مشروع يحتوي متغيرات البيئة (${withEnvs.map((p) => p.name).join(", ")}). أضف secret اسمه VERCEL_PROJECT وحدد اسم المشروع.`);
    }
  }
}

if (!target) {
  mustCreate = true;
  target = { name: REPO_NAME, id: null };
  log(`لا يوجد مشروع مناسب → سيتم إنشاء مشروع جديد باسم: ${REPO_NAME}`);
}

// ---------------------------------------------------------------- 5) create + link
if (mustCreate) {
  run("vercel", ["project", "add", target.name, ...cliArgs()]);
}
run("vercel", ["link", "--project", target.name, "--yes", ...cliArgs()]);
if (fs.existsSync(".vercel/project.json")) {
  const linked = JSON.parse(fs.readFileSync(".vercel/project.json", "utf8"));
  target.id = linked.projectId || target.id;
  target.name = linked.name || target.name;
}

// ---------------------------------------------------------------- 6) env sync
let targetKeys = target.id ? await envKeysOf(target.id) : [];
if (!hasRequired(targetKeys)) {
  log(`المشروع الهدف ينقصه متغيرات مطلوبة (${REQUIRED_ENV_KEYS.filter((k) => !targetKeys.includes(k)).join(", ")})`);
  // ابحث عن مشروع مصدر يحتوي المتغيرات وانسخها كلها
  let source = null;
  for (const p of projects) {
    if (target.id && p.id === target.id) continue;
    const keys = await envKeysOf(p.id);
    if (hasRequired(keys)) { source = p; break; }
  }
  if (!source) {
    log(`تحذير: لم يُعثر على مشروع مصدر يحتوي الأسرار. النشر سيتابع، لكن الموقع لن يعمل بشكل كامل حتى تُضاف يدويًا في Vercel → Project → Settings → Environment Variables: ${REQUIRED_ENV_KEYS.join(", ")}`);
  } else {
    log(`سيتم نسخ متغيرات البيئة من المشروع: ${source.name}`);
    let values = null;
    try {
      const dec = await api(withQ(`/v9/projects/${source.id}/env?decrypt=true`));
      values = (dec.envs || []).filter((e) => e.value !== undefined && e.value !== null);
    } catch (e) {
      log(`decrypt عبر API فشل (${e.message.slice(0, 120)}) — أستخدم vercel env pull`);
    }
    if (!values) {
      const tmp = "/tmp/envsrc";
      fs.mkdirSync(tmp, { recursive: true });
      run("vercel", ["link", "--project", source.name, "--yes", "--cwd", tmp, ...cliArgs()]);
      run("vercel", ["env", "pull", ".env.prod", "--environment", "production", "--yes", "--cwd", tmp, ...cliArgs()]);
      const parsed = {};
      for (const line of fs.readFileSync(`${tmp}/.env.prod`, "utf8").split(/\r?\n/)) {
        const l = line.trim();
        if (!l || l.startsWith("#")) continue;
        const i = l.indexOf("=");
        if (i <= 0) continue;
        let v = l.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        parsed[l.slice(0, i).trim()] = v;
      }
      values = Object.entries(parsed).map(([key, value]) => ({ key, value, type: "encrypted" }));
    }
    if (values.length === 0) {
      log("تحذير: المصدر لا يحتوي قيمًا قابلة للنسخ.");
    } else {
      const payload = values
        .filter((e) => e.key && !["VERCEL", "VERCEL_ENV", "NOW_ID"].includes(e.key))
        .map((e) => ({ key: e.key, value: String(e.value), type: "encrypted", target: ["production", "preview"] }));
      try {
        await api(withQ(`/v10/projects/${target.id}/env`), { method: "POST", body: JSON.stringify(payload) });
        log(`تم نسخ ${payload.length} متغير بيئة: ${payload.map((e) => e.key).join(", ")}`);
        targetKeys = payload.map((e) => e.key);
      } catch (e) {
        log(`تحذير: فشل نسخ المتغيرات (${e.message.slice(0, 200)}) — أضفها يدويًا في لوحة Vercel.`);
      }
    }
  }
} else {
  log(`متغيرات البيئة المطلوبة موجودة في المشروع الهدف ✓`);
}

// ---------------------------------------------------------------- 7) deploy
log(`بدء النشر (production) للمشروع: ${target.name} ...`);
run("vercel", ["deploy", "--prod", "--yes", ...cliArgs()]);
log("تم ✓");
