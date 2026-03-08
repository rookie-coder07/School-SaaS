import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const BASE_URL = process.env.CRAWLER_BASE_URL || "http://localhost:5174";
const REPORT_ROOT = path.resolve(process.cwd(), "ui-test-report");
const ALLOW_DANGEROUS = String(process.env.CRAWLER_ALLOW_DANGEROUS || "false").toLowerCase() === "true";
const QUICK_MODE = String(process.env.CRAWLER_QUICK_MODE || "false").toLowerCase() === "true";
const NO_CLICK_MODE = String(process.env.CRAWLER_NO_CLICK || "false").toLowerCase() === "true";
const PORTALS = String(process.env.CRAWLER_PORTALS || "admin,teacher,developer")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const MAX_DROPDOWN_CLICKS = Number(process.env.CRAWLER_MAX_DROPDOWNS || (QUICK_MODE ? 6 : 12));
const MAX_BUTTON_CLICKS = Number(process.env.CRAWLER_MAX_BUTTONS || (QUICK_MODE ? 8 : 20));
const MAX_TAB_CLICKS = Number(process.env.CRAWLER_MAX_TABS || (QUICK_MODE ? 8 : 20));
const MAX_LINK_CLICKS = Number(process.env.CRAWLER_MAX_LINKS || (QUICK_MODE ? 6 : 15));
const INTERACTION_TIMEOUT_MS = Number(process.env.CRAWLER_INTERACTION_TIMEOUT_MS || (QUICK_MODE ? 800 : 1200));

const credentials = {
  admin: {
    email: process.env.CRAWLER_ADMIN_EMAIL || "admin@school.local",
    password: process.env.CRAWLER_ADMIN_PASSWORD || "admin123",
  },
  teacher: {
    email: process.env.CRAWLER_TEACHER_EMAIL || "teacher@school.local",
    password: process.env.CRAWLER_TEACHER_PASSWORD || "teacher123",
  },
  developer: {
    email: process.env.CRAWLER_DEV_EMAIL || "dev@school.local",
    accessCode: process.env.CRAWLER_DEV_ACCESS_CODE || "supersecretdevkey",
  },
};

const routeSets = {
  admin: [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Analytics", path: "/admin/dashboard?section=analytics" },
    { name: "Students", path: "/admin/dashboard?section=students" },
    { name: "Teachers", path: "/admin/dashboard?section=teachers" },
    { name: "Subjects", path: "/admin/dashboard?section=subjects" },
    { name: "Bulk Upload", path: "/admin/dashboard?section=bulk-upload" },
    { name: "Voice Broadcast", path: "/admin/dashboard?section=announcements" },
    { name: "User Tracking", path: "/admin/dashboard?section=user-tracking" },
  ],
  teacher: [
    { name: "Dashboard", path: "/teacher/dashboard" },
    { name: "Attendance", path: "/teacher/dashboard?section=attendance" },
    { name: "Homework", path: "/teacher/dashboard?section=homework" },
    { name: "Exams", path: "/teacher/dashboard?section=exams" },
    { name: "Class Analytics", path: "/teacher/dashboard?section=analytics" },
  ],
  developer: [
    { name: "Dashboard", path: "/dev-console/dashboard" },
    { name: "System Health", path: "/dev-console/system" },
    { name: "Errors", path: "/dev-console/errors" },
    { name: "Logs", path: "/dev-console/logs" },
    { name: "API Usage", path: "/dev-console/api-usage" },
    { name: "Live Activity", path: "/dev-console/live-activity" },
    { name: "Traces", path: "/dev-console/traces" },
    { name: "Schools", path: "/dev-console/schools" },
    { name: "Users", path: "/dev-console/users" },
    { name: "Voice Messages", path: "/dev-console/voice-messages" },
    { name: "Data Explorer", path: "/dev-console/data-explorer" },
    { name: "System Controls", path: "/dev-console/system-controls" },
    { name: "Audit Logs", path: "/dev-console/audit-logs" },
  ],
};

const quickRouteSets = {
  admin: [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Students", path: "/admin/dashboard?section=students" },
    { name: "Teachers", path: "/admin/dashboard?section=teachers" },
    { name: "Analytics", path: "/admin/dashboard?section=analytics" },
  ],
  teacher: [
    { name: "Dashboard", path: "/teacher/dashboard" },
    { name: "Attendance", path: "/teacher/dashboard?section=attendance" },
    { name: "Homework", path: "/teacher/dashboard?section=homework" },
  ],
  developer: [
    { name: "Dashboard", path: "/dev-console/dashboard" },
    { name: "Errors", path: "/dev-console/errors" },
    { name: "Users", path: "/dev-console/users" },
    { name: "Data Explorer", path: "/dev-console/data-explorer" },
    { name: "System Controls", path: "/dev-console/system-controls" },
  ],
};

const tableExpectedRoutes = [
  "/dev-console/schools",
  "/dev-console/users",
  "/dev-console/voice-messages",
  "/dev-console/data-explorer",
  "/dev-console/audit-logs",
  "/dev-console/logs",
];

const dangerTokens = [
  "delete",
  "disable",
  "logout",
  "clear cache",
  "force logout",
  "remove",
  "drop",
  "reset",
];

const nowStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const sanitize = (value) =>
  String(value || "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 120);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function screenshot(page, filePath) {
  await ensureDir(path.dirname(filePath));
  await page.screenshot({ path: filePath, fullPage: true });
}

function issueFactory(report, portal, routeName, routePath) {
  return async (type, details, page, screenshotDir) => {
    const issue = {
      portal,
      routeName,
      routePath,
      type,
      details,
      timestamp: new Date().toISOString(),
    };
    if (page && screenshotDir) {
      const fileName = `${sanitize(portal)}-${sanitize(routeName)}-${sanitize(type)}-${Date.now()}.png`;
      const issueShot = path.join(screenshotDir, fileName);
      try {
        await screenshot(page, issueShot);
        issue.screenshot = issueShot;
      } catch {
        // ignore screenshot failures
      }
    }
    report.uiIssues.push(issue);
  };
}

function attachEventCollectors(page, report, portal, routeName, routePath) {
  const onConsole = (msg) => {
    const text = msg.text();
    const type = msg.type();
    const row = {
      portal,
      routeName,
      routePath,
      level: type,
      message: text,
      timestamp: new Date().toISOString(),
    };
    if (type === "error") report.consoleErrors.push(row);
    if (
      /warning|warn|each child in a list|react does not recognize|failed prop type|deprecated/i.test(text) &&
      !/download the react devtools|main\.jsx loaded - react app initializing/i.test(text)
    ) {
      report.reactWarnings.push(row);
    }
  };

  const onPageError = (err) => {
    report.consoleErrors.push({
      portal,
      routeName,
      routePath,
      level: "pageerror",
      message: String(err?.message || err),
      timestamp: new Date().toISOString(),
    });
  };

  const onRequestFailed = (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (/net::ERR_ABORTED/i.test(failure)) return;
    report.networkErrors.push({
      portal,
      routeName,
      routePath,
      url: request.url(),
      method: request.method(),
      failure,
      timestamp: new Date().toISOString(),
    });
  };

  const onResponse = async (response) => {
    const url = response.url();
    const status = response.status();
    if (!url.includes("/api/")) return;
    if (status < 400) return;
    report.failedApis.push({
      portal,
      routeName,
      routePath,
      url,
      method: response.request().method(),
      status,
      timestamp: new Date().toISOString(),
    });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  return () => {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  };
}

async function checkUiSignals(page, addIssue, routePath, screenshotDir) {
  const results = await page.evaluate(({ tableExpectedRoutes }) => {
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number(style.opacity || 1) === 0) return false;
      return rect.width > 0 && rect.height > 0;
    };

    const blankDropdowns = [];
    document.querySelectorAll("select").forEach((select, idx) => {
      if (!isVisible(select)) return;
      const options = Array.from(select.options || []);
      const blank = options.filter((o) => o && String(o.textContent || "").trim() === "");
      if (blank.length > 0) {
        blankDropdowns.push({
          index: idx,
          name: select.getAttribute("name") || "",
          id: select.id || "",
          blankCount: blank.length,
        });
      }
    });

    const zeroSizeNodes = [];
    document.querySelectorAll("button,a,input,select,textarea,[role='button'],[role='tab']").forEach((el, idx) => {
      if (!isVisible(el)) return;
      if (el.classList?.contains("sr-only")) return;
      if (el.closest?.(".sr-only,[aria-hidden='true'],[hidden]")) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        zeroSizeNodes.push({
          index: idx,
          tag: el.tagName,
          text: String(el.textContent || "").trim().slice(0, 80),
          width: rect.width,
          height: rect.height,
        });
      }
    });

    const invisibleText = [];
    document.querySelectorAll("p,span,td,th,label,h1,h2,h3,h4,button,a").forEach((el, idx) => {
      const text = String(el.textContent || "").trim();
      if (!text || text.length < 3) return;
      if (!isVisible(el)) return;
      const style = window.getComputedStyle(el);
      const color = style.color || "";
      if (/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/i.test(color)) {
        invisibleText.push({ index: idx, tag: el.tagName, text: text.slice(0, 80), color });
      }
    });

    const overflowNodes = [];
    const bodyWidth = document.documentElement.clientWidth || window.innerWidth || 0;
    document.querySelectorAll("table,div,section,article,main").forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (el.scrollWidth > bodyWidth + 50) {
        overflowNodes.push({
          index: idx,
          tag: el.tagName,
          className: el.className || "",
          width: rect.width,
          scrollWidth: el.scrollWidth,
          bodyWidth,
        });
      }
    });

    const hasTable = document.querySelector("table");
    const expectTable = tableExpectedRoutes.some((route) => String(location.pathname || "").startsWith(route));

    return {
      blankDropdowns,
      zeroSizeNodes,
      invisibleText,
      overflowNodes,
      missingTable: expectTable && !hasTable,
    };
  }, { tableExpectedRoutes });

  if (results.blankDropdowns.length) {
    await addIssue("blank_dropdown_options", results.blankDropdowns, page, screenshotDir);
  }
  if (results.zeroSizeNodes.length) {
    await addIssue("zero_size_ui_elements", results.zeroSizeNodes.slice(0, 20), page, screenshotDir);
  }
  if (results.invisibleText.length) {
    await addIssue("invisible_text", results.invisibleText.slice(0, 20), page, screenshotDir);
  }
  if (results.overflowNodes.length) {
    await addIssue("overflow_layout", results.overflowNodes.slice(0, 20), page, screenshotDir);
  }
  if (results.missingTable) {
    await addIssue("missing_data_table", { routePath }, page, screenshotDir);
  }
}

async function clickDropdowns(page, addIssue, screenshotDir) {
  const count = Math.min(await page.locator("select:visible").count(), MAX_DROPDOWN_CLICKS);
  for (let i = 0; i < count; i += 1) {
    const select = page.locator("select:visible").nth(i);
    try {
      const options = await select.locator("option").allTextContents();
      if (options.length <= 1) continue;
      await select.click({ timeout: INTERACTION_TIMEOUT_MS });
      const nextIndex = options.length > 1 ? 1 : 0;
      const value = await select.locator("option").nth(nextIndex).getAttribute("value");
      if (value != null) {
        await select.selectOption(value);
      }
      await page.waitForTimeout(80);
    } catch (err) {
      await addIssue("dropdown_interaction_failed", { index: i, error: String(err?.message || err) }, page, screenshotDir);
    }
  }
}

async function clickElements(page, selector, kind, baseRouteUrl, addIssue, screenshotDir) {
  const elements = page.locator(`${selector}:visible`);
  const maxByKind =
    kind === "button" ? MAX_BUTTON_CLICKS : kind === "tab" ? MAX_TAB_CLICKS : MAX_LINK_CLICKS;
  for (let i = 0; i < maxByKind; i += 1) {
    const currentCount = await elements.count();
    if (i >= currentCount) break;
    const el = elements.nth(i);
    try {
      const text = String((await el.innerText().catch(() => "")) || "").trim().toLowerCase();
      if (!ALLOW_DANGEROUS && dangerTokens.some((token) => text.includes(token))) {
        continue;
      }
      const handle = await el.elementHandle({ timeout: INTERACTION_TIMEOUT_MS }).catch(() => null);
      if (!handle) continue;
      const disabled = await handle
        .evaluate((node) => node.hasAttribute("disabled") || node.getAttribute("aria-disabled") === "true")
        .catch(() => false);
      if (disabled) continue;
      await el.scrollIntoViewIfNeeded();
      await el.click({ timeout: INTERACTION_TIMEOUT_MS });
      await page.waitForTimeout(80);
      if (!page.url().startsWith(baseRouteUrl)) {
        await page.goto(baseRouteUrl, { waitUntil: "domcontentloaded" });
      }
    } catch (err) {
      await addIssue(`${kind}_click_failed`, { index: i, error: String(err?.message || err) }, page, screenshotDir);
    }
  }
}

async function loginAdmin(page) {
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type='email']", credentials.admin.email);
  await page.fill("input[type='password']", credentials.admin.password);
  await page.click("button[type='submit']");
  await waitForAuthOutcome(page, /\/admin\/dashboard/, "admin");
}

async function loginTeacher(page) {
  await page.goto(`${BASE_URL}/teacher/login`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type='email']", credentials.teacher.email);
  await page.fill("input[type='password']", credentials.teacher.password);
  await page.click("button[type='submit']");
  await waitForAuthOutcome(page, /\/teacher\/(dashboard|change-password)/, "teacher");
}

async function loginDeveloper(page) {
  await page.goto(`${BASE_URL}/dev-login`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type='email']", credentials.developer.email);
  await page.fill("input[type='password']", credentials.developer.accessCode);
  await page.click("button[type='submit']");
  await waitForAuthOutcome(page, /\/dev-console/, "developer");
}

async function waitForAuthOutcome(page, successRegex, portal) {
  const timeoutMs = 15000;
  const start = Date.now();

  const looksLikeAuthError = async () => {
    return page.evaluate(() => {
      const selectors = [
        "[role='alert']",
        ".alert",
        ".error",
        ".error-message",
        ".text-red-500",
        ".text-red-600",
        ".text-red-700",
        ".text-rose-500",
        ".text-rose-600",
        ".text-rose-700",
      ];
      const nodes = selectors.flatMap((s) => Array.from(document.querySelectorAll(s)));
      const text = nodes
        .map((n) => String(n.textContent || "").trim().toLowerCase())
        .filter(Boolean)
        .join(" | ");
      if (!text) return "";
      const patterns = [
        "invalid",
        "incorrect",
        "wrong",
        "failed",
        "unauthorized",
        "access denied",
        "credentials",
        "not allowed",
      ];
      return patterns.some((p) => text.includes(p)) ? text.slice(0, 300) : "";
    });
  };

  while (Date.now() - start < timeoutMs) {
    const currentUrl = page.url();
    if (successRegex.test(currentUrl)) return;

    const authErrorText = await looksLikeAuthError().catch(() => "");
    if (authErrorText) {
      throw new Error(`Login failed (${portal}): ${authErrorText}`);
    }

    await page.waitForTimeout(200);
  }

  throw new Error(`Login timed out (${portal}). Current URL: ${page.url()}`);
}

async function crawlPortal(browser, portal, routes, loginFn, report, screenshotDir) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await loginFn(page);
  } catch (err) {
    let loginScreenshot = "";
    try {
      loginScreenshot = path.join(screenshotDir, `${sanitize(portal)}-login-failed-${Date.now()}.png`);
      await screenshot(page, loginScreenshot);
    } catch {
      loginScreenshot = "";
    }
    report.portalLoginFailures.push({
      portal,
      error: String(err?.message || err),
      timestamp: new Date().toISOString(),
      screenshot: loginScreenshot || undefined,
    });
    await context.close();
    return;
  }

  for (const route of routes) {
    const routeUrl = `${BASE_URL}${route.path}`;
    const addIssue = issueFactory(report, portal, route.name, route.path);
    const detachCollectors = attachEventCollectors(page, report, portal, route.name, route.path);
    report.pagesTested.push({ portal, routeName: route.name, routePath: route.path, url: routeUrl });
    try {
      await page.goto(routeUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(450);
      const baseShot = path.join(screenshotDir, `${sanitize(portal)}-${sanitize(route.name)}.png`);
      await screenshot(page, baseShot);
      report.pageScreenshots.push(baseShot);

      await checkUiSignals(page, addIssue, route.path, screenshotDir);
      if (!NO_CLICK_MODE) {
        await clickDropdowns(page, addIssue, screenshotDir);
        await clickElements(page, "button,[role='button']", "button", routeUrl, addIssue, screenshotDir);
        await clickElements(page, "[role='tab'],.tab,button[aria-selected]", "tab", routeUrl, addIssue, screenshotDir);
        await clickElements(page, "a", "link", routeUrl, addIssue, screenshotDir);
        await checkUiSignals(page, addIssue, route.path, screenshotDir);
      }
    } catch (err) {
      await addIssue("page_navigation_failed", { error: String(err?.message || err) }, page, screenshotDir);
    } finally {
      detachCollectors();
    }
  }

  await context.close();
}

function dedupe(items, keys) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const signature = keys.map((k) => String(item?.[k] || "")).join("|");
    if (seen.has(signature)) continue;
    seen.add(signature);
    out.push(item);
  }
  return out;
}

function buildMarkdown(report) {
  return `# UI Crawler Report

- Generated: ${report.generatedAt}
- Base URL: ${report.baseUrl}
- Pages tested: ${report.pagesTested.length}
- Console errors: ${report.consoleErrors.length}
- React warnings: ${report.reactWarnings.length}
- Failed APIs: ${report.failedApis.length}
- Network errors: ${report.networkErrors.length}
- UI issues: ${report.uiIssues.length}
- Login failures: ${report.portalLoginFailures.length}

## Pages Tested
${report.pagesTested.map((p) => `- [${p.portal}] ${p.routeName} (${p.routePath})`).join("\n")}

## Portal Login Failures
${report.portalLoginFailures.length ? report.portalLoginFailures.map((f) => `- ${f.portal}: ${f.error}`).join("\n") : "- none"}

## Console Errors
${report.consoleErrors.length ? report.consoleErrors.map((e) => `- [${e.portal}] ${e.routePath}: ${e.message}`).join("\n") : "- none"}

## Failed APIs
${report.failedApis.length ? report.failedApis.map((e) => `- [${e.portal}] ${e.status} ${e.method} ${e.url}`).join("\n") : "- none"}

## UI Issues
${report.uiIssues.length ? report.uiIssues.map((i) => `- [${i.portal}] ${i.routePath} ${i.type}`).join("\n") : "- none"}
`;
}

async function main() {
  const stamp = nowStamp();
  const outDir = path.join(REPORT_ROOT, stamp);
  const screenshotDir = path.join(outDir, "screenshots");
  await ensureDir(screenshotDir);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    config: { allowDangerousClicks: ALLOW_DANGEROUS, quickMode: QUICK_MODE, noClickMode: NO_CLICK_MODE, portals: PORTALS },
    pagesTested: [],
    pageScreenshots: [],
    consoleErrors: [],
    reactWarnings: [],
    networkErrors: [],
    failedApis: [],
    uiIssues: [],
    portalLoginFailures: [],
  };

  const browser = await chromium.launch({ headless: true });
  const activeRoutes = QUICK_MODE ? quickRouteSets : routeSets;
  try {
    if (PORTALS.includes("admin")) {
      await crawlPortal(browser, "admin", activeRoutes.admin, loginAdmin, report, screenshotDir);
    }
    if (PORTALS.includes("teacher")) {
      await crawlPortal(browser, "teacher", activeRoutes.teacher, loginTeacher, report, screenshotDir);
    }
    if (PORTALS.includes("developer")) {
      await crawlPortal(browser, "developer", activeRoutes.developer, loginDeveloper, report, screenshotDir);
    }
  } finally {
    await browser.close();
  }

  report.consoleErrors = dedupe(report.consoleErrors, ["portal", "routePath", "message"]);
  report.reactWarnings = dedupe(report.reactWarnings, ["portal", "routePath", "message"]);
  report.failedApis = dedupe(report.failedApis, ["portal", "routePath", "method", "url", "status"]);
  report.networkErrors = dedupe(report.networkErrors, ["portal", "routePath", "method", "url", "failure"]);

  const jsonPath = path.join(outDir, "report.json");
  const mdPath = path.join(outDir, "report.md");
  const latestPath = path.join(REPORT_ROOT, "latest.json");
  const latestMdPath = path.join(REPORT_ROOT, "latest.md");

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(mdPath, buildMarkdown(report), "utf8");
  await fs.writeFile(latestPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(latestMdPath, buildMarkdown(report), "utf8");

  console.log(`UI crawl completed.`);
  console.log(`Report: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
}

main().catch((err) => {
  console.error("UI crawler failed:", err);
  process.exitCode = 1;
});
