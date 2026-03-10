import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "server");
const OUTPUT_DIR = path.join(ROOT, "logs");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "tenant-query-audit.md");

const TENANT_COLLECTIONS = new Set([
  "students",
  "teachers",
  "users",
  "attendance",
  "homework",
  "exams",
  "marks",
  "voiceMessages",
  "voice_messages",
  "notifications",
  "timetables",
  "analytics",
]);

const QUERY_OP_REGEX = /\.(findOneAndUpdate|findOneAndDelete|findById|findOne|find|updateOne|updateMany|deleteOne|deleteMany|aggregate)\s*\(/;

const SKIP_DIRS = new Set(["node_modules", ".git", "uploads", "logs", "backups"]);

const IGNORE_FILE_PATTERNS = [
  /server[\\/](seed|migrate).*\.js$/i,
  /server[\\/]scripts[\\/].*\.js$/i,
  /server[\\/]routes[\\/]devRoutes\.js$/i,
  /server[\\/]services[\\/]developerSeedService\.js$/i,
];

const hasTenantContext = (text) => {
  const normalized = String(text || "").toLowerCase();
  return (
    normalized.includes("schoolid") ||
    normalized.includes("tenantfilter") ||
    normalized.includes("schoolidobj") ||
    normalized.includes("activestudentfilter") ||
    normalized.includes("activeteacherfilter") ||
    normalized.includes("requiretenantid") ||
    normalized.includes("requiredeveloper") ||
    normalized.includes("/api/dev/") ||
    normalized.includes("secure developer login") ||
    normalized.includes("invalid developer access code")
  );
};

const walkFiles = (dir, result = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkFiles(fullPath, result);
      }
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".js")) {
      result.push(fullPath);
    }
  }
  return result;
};

const inspectFile = (filePath) => {
  if (IGNORE_FILE_PATTERNS.some((pattern) => pattern.test(filePath))) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const collMatch = line.match(/db\.collection\("([^"]+)"\)/);
    if (!collMatch) continue;

    const collection = collMatch[1];
    if (!TENANT_COLLECTIONS.has(collection)) continue;

    let opLineIndex = -1;
    let opName = "";
    for (let j = i; j < Math.min(lines.length, i + 7); j += 1) {
      const opMatch = lines[j].match(QUERY_OP_REGEX);
      if (opMatch) {
        opLineIndex = j;
        opName = opMatch[1];
        break;
      }
    }
    if (opLineIndex === -1) continue;

    const windowStart = Math.max(0, i - 50);
    const windowEnd = Math.min(lines.length - 1, opLineIndex + 18);
    const context = lines.slice(windowStart, windowEnd + 1).join("\n");

    if (!hasTenantContext(context)) {
      findings.push({
        filePath,
        line: opLineIndex + 1,
        collection,
        opName,
        snippet: lines.slice(i, Math.min(lines.length, opLineIndex + 3)).join("\n"),
      });
    }
  }

  return findings;
};

const main = () => {
  const allFiles = walkFiles(ROOT).filter((filePath) => {
    const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
    return !relative.startsWith("scripts/");
  });

  const findings = allFiles.flatMap(inspectFile);
  const groupedByFile = new Map();
  for (const item of findings) {
    const key = path.relative(process.cwd(), item.filePath).replace(/\\/g, "/");
    if (!groupedByFile.has(key)) groupedByFile.set(key, []);
    groupedByFile.get(key).push(item);
  }

  const lines = [];
  lines.push("# Tenant Query Audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("- Scans backend `.js` files for tenant-collection query operations.");
  lines.push("- Flags query calls where nearby code does not include obvious tenant context.");
  lines.push("- This is static analysis and requires manual review for each flagged item.");
  lines.push("");
  lines.push("## Tenant Collections");
  lines.push(`- ${Array.from(TENANT_COLLECTIONS).join(", ")}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Files scanned: ${allFiles.length}`);
  lines.push(`- Flagged query sites: ${findings.length}`);
  lines.push("");

  if (findings.length === 0) {
    lines.push("No missing-tenant-context query sites found by this audit.");
  } else {
    lines.push("## Flagged Sites");
    for (const [file, fileFindings] of groupedByFile.entries()) {
      lines.push("");
      lines.push(`### ${file}`);
      for (const finding of fileFindings) {
        lines.push(`- [ ] Line ${finding.line}: \`${finding.collection}.${finding.opName}\``);
        lines.push("```js");
        lines.push(finding.snippet);
        lines.push("```");
      }
    }
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, `${lines.join("\n")}\n`, "utf8");
  console.log(`Tenant query audit report written: ${OUTPUT_FILE}`);
  console.log(`Flagged query sites: ${findings.length}`);
};

main();
