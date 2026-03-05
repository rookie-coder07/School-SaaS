import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const API_BASE = process.env.SMOKE_API_BASE || "http://localhost:5000";

const assertOk = async (label, response) => {
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${JSON.stringify(parsed)}`);
  }
  return parsed;
};

async function run() {
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI");
  if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");

  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();

  try {
    const teacher = await db.collection("teachers").findOne({ isDeleted: { $ne: true } });
    if (!teacher) throw new Error("No teacher found");

    const token = jwt.sign(
      {
        userId: String(teacher.userId),
        role: "TEACHER",
        schoolId: String(teacher.schoolId),
        class: String(teacher.class || ""),
        section: String(teacher.section || ""),
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const headers = { Authorization: `Bearer ${token}` };
    const cls = encodeURIComponent(String(teacher.class || ""));
    const sec = encodeURIComponent(String(teacher.section || ""));
    const date = new Date().toISOString().slice(0, 10);

    const checks = [
      ["GET /api/debug/health", `${API_BASE}/api/debug/health`],
      ["GET /api/teacher/class-summary", `${API_BASE}/api/teacher/class-summary`],
      ["GET /api/teacher/students", `${API_BASE}/api/teacher/students?className=${cls}&section=${sec}`],
      ["GET /api/teacher/attendance", `${API_BASE}/api/teacher/attendance?date=${date}&className=${cls}&section=${sec}`],
      ["GET /api/teacher/attendance/summary", `${API_BASE}/api/teacher/attendance/summary?className=${cls}&section=${sec}`],
      ["GET /api/teacher/marks", `${API_BASE}/api/teacher/marks`],
      ["GET /api/teacher/subjects", `${API_BASE}/api/teacher/subjects?class=${cls}&section=${sec}`],
      ["GET /api/teacher/exams", `${API_BASE}/api/teacher/exams?scope=marks&class=${cls}&section=${sec}`],
      ["GET /api/teacher/timetable", `${API_BASE}/api/teacher/timetable`],
      ["GET /api/notifications/unread-count", `${API_BASE}/api/notifications/unread-count`],
    ];

    for (const [label, url] of checks) {
      const res = await fetch(url, { headers });
      const payload = await assertOk(label, res);
      console.log(
        JSON.stringify({
          label,
          status: res.status,
          shape: Array.isArray(payload)
            ? `array(${payload.length})`
            : `object(${Object.keys(payload || {}).slice(0, 6).join(",")})`,
        })
      );
    }

    const forbidden = await fetch(`${API_BASE}/api/admin/users`, { headers });
    if (forbidden.status !== 403 && forbidden.status !== 401) {
      throw new Error(`RBAC check failed for teacher->admin route: ${forbidden.status}`);
    }
    console.log(JSON.stringify({ label: "RBAC teacher->admin", status: forbidden.status }));

    console.log("TEACHER_PORTAL_SMOKE_OK");
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error("TEACHER_PORTAL_SMOKE_FAILED:", err.message);
  process.exit(1);
});

