import { exec } from "child_process";
import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");

// Load backend env explicitly so the script works when run from project root.
dotenv.config({ path: path.join(serverDir, ".env") });

const mongoUri = String(process.env.MONGO_URI || "").trim();

const pad2 = (value) => String(value).padStart(2, "0");

const buildTimestamp = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day}-${hours}-${minutes}`;
};

const rotateBackups = (backupsDir, keepLatest = 7) => {
  const files = readdirSync(backupsDir)
    .filter((fileName) => fileName.startsWith("backup-") && fileName.endsWith(".gz"))
    .map((fileName) => {
      const filePath = path.join(backupsDir, fileName);
      const stats = statSync(filePath);
      return { fileName, filePath, mtimeMs: stats.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (files.length <= keepLatest) {
    console.log("Old backups removed: 0");
    return;
  }

  const removable = files.slice(keepLatest);
  let removedCount = 0;
  for (const item of removable) {
    try {
      unlinkSync(item.filePath);
      removedCount += 1;
    } catch (error) {
      console.warn(`Failed to remove old backup ${item.fileName}:`, error.message);
    }
  }
  console.log(`Old backups removed: ${removedCount}`);
};

if (!mongoUri) {
  console.error("Backup error: MONGO_URI is not set");
  process.exitCode = 1;
} else {
  const backupsDir = path.join(serverDir, "backups");
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
    console.log(`Created backups directory: ${backupsDir}`);
  }

  exec("mongodump --version", (probeError) => {
    if (probeError) {
      console.warn("mongodump is not installed or not available in PATH. Skipping backup.");
      return;
    }

    const filename = `backup-${buildTimestamp()}.gz`;
    const archivePath = path.join(backupsDir, filename);
    const backupCommand = `mongodump --uri="${mongoUri}" --archive="${archivePath}" --gzip`;
    console.log("Mongo backup started");

    exec(backupCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Backup error:", error.message);
        if (stderr) console.error(stderr);
        process.exitCode = 1;
        return;
      }
      if (stdout) console.log(stdout.trim());
      if (stderr) console.warn(stderr.trim());
      console.log(`Backup created: ${archivePath}`);
      console.log("Mongo backup completed");

      try {
        rotateBackups(backupsDir, 7);
      } catch (rotationError) {
        console.error("Backup rotation error:", rotationError.message);
        process.exitCode = 1;
      }
    });
  });
}
