import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), "server/.env");
dotenv.config({ path: envPath });

const API_BASE_URL = String(process.env.DEV_SMOKE_API_URL || process.env.BASE_URL || "http://127.0.0.1:5000").trim();
const DEV_EMAIL = String(process.env.DEV_SMOKE_EMAIL || "dev@edunest.dev").trim().toLowerCase();
const DEV_PASSWORD = String(process.env.DEV_SMOKE_PASSWORD || "developer123").trim();
const DEV_ACCESS_CODE = String(process.env.DEVELOPER_ACCESS_CODE || process.env.DEV_ACCESS_CODE || "").trim();

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function run() {
  if (!DEV_ACCESS_CODE) {
    fail("DEVELOPER_ACCESS_CODE (or DEV_ACCESS_CODE fallback) is required for smoke auth test.");
  }

  const dashboardNoAuth = await fetch(`${API_BASE_URL}/api/dev/dashboard`);
  const dashboardNoAuthBody = await parseJsonSafe(dashboardNoAuth);
  if (dashboardNoAuth.status !== 403) {
    fail(`Expected 403 without token, got ${dashboardNoAuth.status}. Body: ${JSON.stringify(dashboardNoAuthBody)}`);
  }

  const loginResponse = await fetch(`${API_BASE_URL}/api/dev/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      accessCode: DEV_ACCESS_CODE,
    }),
  });
  const loginBody = await parseJsonSafe(loginResponse);
  if (!loginResponse.ok || !loginBody?.token) {
    fail(`Login failed with status ${loginResponse.status}. Body: ${JSON.stringify(loginBody)}`);
  }

  const dashboardWithAuth = await fetch(`${API_BASE_URL}/api/dev/dashboard`, {
    headers: { Authorization: `Bearer ${loginBody.token}` },
  });
  const dashboardWithAuthBody = await parseJsonSafe(dashboardWithAuth);
  if (!dashboardWithAuth.ok || dashboardWithAuthBody?.success !== true) {
    fail(
      `Authenticated dashboard check failed with status ${dashboardWithAuth.status}. Body: ${JSON.stringify(dashboardWithAuthBody)}`
    );
  }

  console.log("smoke:dev-auth passed");
  console.log(
    JSON.stringify({
      apiBaseUrl: API_BASE_URL,
      loginSuccess: true,
      unauthDashboardStatus: dashboardNoAuth.status,
      authDashboardSuccess: dashboardWithAuthBody.success,
    })
  );
}

run().catch((err) => {
  fail(`smoke:dev-auth failed: ${err?.message || err}`);
});
