import cron from "node-cron";
import { exec } from "child_process";

let isSchedulerStarted = false;
let isBackupRunning = false;

export function startBackupScheduler() {
  if (isSchedulerStarted) {
    console.log("[BACKUP] Scheduler already started, skipping duplicate init");
    return;
  }

  isSchedulerStarted = true;

  cron.schedule("0 2 * * *", () => {
    if (isBackupRunning) {
      console.warn("[BACKUP] Previous backup is still running, skipping this run");
      return;
    }

    isBackupRunning = true;
    console.log(`[BACKUP] Daily MongoDB backup started at ${new Date().toISOString()}`);

    exec("npm run backup:db", (error, stdout, stderr) => {
      if (error) {
        console.error("[BACKUP ERROR] Backup command failed:", error.message);
        if (stderr) {
          console.error("[BACKUP ERROR][STDERR]", stderr.trim());
        }
        isBackupRunning = false;
        return;
      }

      if (stderr) {
        console.warn("[BACKUP STDERR]", stderr.trim());
      }
      if (stdout) {
        console.log("[BACKUP OUTPUT]", stdout.trim());
      }
      console.log(`[BACKUP SUCCESS] Daily MongoDB backup completed at ${new Date().toISOString()}`);
      isBackupRunning = false;
    });
  });

  console.log("[BACKUP] Scheduler initialized (daily at 02:00 server time)");
}
