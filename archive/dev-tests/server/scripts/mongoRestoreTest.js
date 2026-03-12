import { exec } from "child_process";
import { readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");
const backupsDir = path.join(serverDir, "backups");

dotenv.config({ path: path.join(serverDir, ".env") });

const restoreUri = String(process.env.MONGO_RESTORE_TEST_URI || "mongodb://localhost:27017/school_restore_test").trim();

const findLatestBackup = () => {
  let files = [];
  try {
    files = readdirSync(backupsDir)
      .filter((fileName) => fileName.startsWith("backup-") && fileName.endsWith(".gz"))
      .map((fileName) => {
        const filePath = path.join(backupsDir, fileName);
        const stats = statSync(filePath);
        return { fileName, filePath, mtimeMs: stats.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch (error) {
    console.error("Restore test error: unable to read backup directory", error.message);
    process.exitCode = 1;
    return null;
  }

  return files[0] || null;
};

const latest = findLatestBackup();
if (!latest) {
  console.error("Restore test error: no backup file found in server/backups");
  process.exitCode = 1;
} else {
  exec("mongorestore --version", (probeError) => {
    if (probeError) {
      console.warn("mongorestore is not installed or not available in PATH. Skipping restore test.");
      return;
    }

    const restoreCommand = `mongorestore --uri="${restoreUri}" --archive="${latest.filePath}" --gzip`;
    console.log("Restore test started");

    exec(restoreCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Restore test error:", error.message);
        if (stderr) console.error(stderr);
        process.exitCode = 1;
        return;
      }
      if (stdout) console.log(stdout.trim());
      if (stderr) console.warn(stderr.trim());
      console.log(`Restore source: ${latest.filePath}`);
      console.log("Restore test completed");
    });
  });
}

