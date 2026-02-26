/* eslint-disable no-console */
const BASE_URL = (process.env.BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 20));
const REQUESTS_PER_ENDPOINT = Math.max(10, Number(process.env.REQUESTS_PER_ENDPOINT || 200));
const TIMEOUT_MS = Math.max(1000, Number(process.env.TIMEOUT_MS || 10000));
const BOTTLENECK_P95_MS = Math.max(50, Number(process.env.BOTTLENECK_P95_MS || 500));

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_SCHOOL_ID = process.env.ADMIN_SCHOOL_ID || "";

const TEACHER_EMAIL = process.env.TEACHER_EMAIL || "demo2_teacher@example.com";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "teacher123";

const STUDENT_EMAIL = process.env.STUDENT_EMAIL || "demo2_student1@example.com";
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD || "student123";

const nowMs = () => Number(process.hrtime.bigint() / 1000000n);

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function loginAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return { token: null, reason: "ADMIN_EMAIL / ADMIN_PASSWORD not provided" };
  }
  const body = { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  if (ADMIN_SCHOOL_ID) body.schoolId = ADMIN_SCHOOL_ID;
  const r = await postJson("/api/auth/login", body);
  return r.ok ? { token: r.json.token, reason: "" } : { token: null, reason: `login failed (${r.status})` };
}

async function loginTeacher() {
  const r = await postJson("/api/auth/teacher/login", { email: TEACHER_EMAIL, password: TEACHER_PASSWORD });
  return r.ok ? { token: r.json.token, reason: "" } : { token: null, reason: `login failed (${r.status})` };
}

async function loginStudent() {
  const r = await postJson("/api/auth/student/login", { email: STUDENT_EMAIL, password: STUDENT_PASSWORD });
  return r.ok ? { token: r.json.token, reason: "" } : { token: null, reason: `login failed (${r.status})` };
}

async function hit(path, token = "") {
  const started = nowMs();
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { ok: res.ok, status: res.status, ms: nowMs() - started };
  } catch (err) {
    return { ok: false, status: 0, ms: nowMs() - started, err: err?.message || "request failed" };
  }
}

function summarize(label, path, role, results) {
  const total = results.length;
  const success = results.filter((r) => r.ok).length;
  const failed = total - success;
  const lats = results.map((r) => r.ms).sort((a, b) => a - b);
  const pick = (pct) => lats[Math.min(lats.length - 1, Math.floor((pct / 100) * lats.length))] || 0;
  const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;
  const byStatus = results.reduce((acc, r) => {
    const key = String(r.status || "ERR");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    role,
    label,
    path,
    total,
    success,
    failed,
    avgMs: avg,
    p95Ms: pick(95),
    p99Ms: pick(99),
    status: JSON.stringify(byStatus),
  };
}

async function runEndpoint({ role, label, path, token }) {
  const state = { next: 0, results: [] };
  const worker = async () => {
    while (true) {
      state.next += 1;
      if (state.next > REQUESTS_PER_ENDPOINT) return;
      const result = await hit(path, token);
      state.results.push(result);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return summarize(label, path, role, state.results);
}

async function main() {
  console.log("Performance profile start");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Requests/endpoint: ${REQUESTS_PER_ENDPOINT}`);
  console.log(`Timeout(ms): ${TIMEOUT_MS}`);

  const [admin, teacher, student] = await Promise.all([loginAdmin(), loginTeacher(), loginStudent()]);
  console.log(`Auth admin: ${admin.token ? "ok" : `skip (${admin.reason})`}`);
  console.log(`Auth teacher: ${teacher.token ? "ok" : `skip (${teacher.reason})`}`);
  console.log(`Auth student: ${student.token ? "ok" : `skip (${student.reason})`}`);

  const tests = [
    { role: "public", label: "Health", path: "/", token: "" },
    { role: "admin", label: "Admin Students", path: "/api/admin/users?type=students&page=1&limit=25", token: admin.token },
    { role: "admin", label: "Admin Teachers", path: "/api/admin/users?type=teachers&page=1&limit=25", token: admin.token },
    { role: "teacher", label: "Teacher Summary", path: "/api/teacher/dashboard-summary", token: teacher.token },
    { role: "teacher", label: "Teacher Students", path: "/api/teacher/students", token: teacher.token },
    { role: "teacher", label: "Teacher Class Summary", path: "/api/teacher/class-summary", token: teacher.token },
    { role: "student", label: "Student Dashboard", path: "/api/student/dashboard", token: student.token },
    { role: "student", label: "Student Summary", path: "/api/student/dashboard-summary", token: student.token },
    { role: "student", label: "Student Marks", path: "/api/student/marks?format=v2", token: student.token },
    { role: "student", label: "Student Attendance", path: "/api/student/attendance?page=1&limit=30", token: student.token },
  ];

  const runnable = tests.filter((t) => t.role === "public" || Boolean(t.token));
  const skipped = tests.filter((t) => !runnable.includes(t)).map((t) => `${t.role}:${t.label}`);
  if (skipped.length) console.log(`Skipped endpoints: ${skipped.join(", ")}`);

  const rows = [];
  for (const test of runnable) {
    const row = await runEndpoint(test);
    rows.push(row);
    console.log(`Done: ${row.role} ${row.label} p95=${row.p95Ms}ms failed=${row.failed}`);
  }

  console.log("\nEndpoint Profile");
  console.table(rows);

  const bottlenecks = rows.filter((r) => r.failed > 0 || r.p95Ms >= BOTTLENECK_P95_MS);
  if (bottlenecks.length) {
    console.log(`\nPotential bottlenecks (failed>0 or p95>=${BOTTLENECK_P95_MS}ms):`);
    console.table(bottlenecks);
    process.exitCode = 1;
  } else {
    console.log(`\nNo bottlenecks above threshold (${BOTTLENECK_P95_MS}ms p95).`);
  }
}

main().catch((err) => {
  console.error("Profile run failed:", err);
  process.exit(1);
});
