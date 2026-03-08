import cron from "node-cron";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, "mongoBackup.js");

const runBackup = () => {
  console.log(`[backup-cron] Running daily MongoDB backup at ${new Date().toISOString()}`);
  const child = spawn(process.execPath, [scriptPath], { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code === 0) {
      console.log("[backup-cron] Backup finished successfully");
    } else {
      console.error(`[backup-cron] Backup failed with exit code ${code}`);
    }
  });
};

// Daily at 2 AM server time.
cron.schedule("0 2 * * *", runBackup);
console.log("[backup-cron] Scheduled daily backup for 02:00");

