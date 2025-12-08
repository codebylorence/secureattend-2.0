import cron from "node-cron";
import Attendance from "../models/attendance.js";

/**
 * Scheduled job to clean up invalid "Absent" records
 * Runs every hour to remove premature absent records
 */
export const startScheduleCleanupJob = () => {
  // Run every hour
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const todayDate = `${year}-${month}-${day}`;

      // Delete all absent records for today
      // They will be recreated correctly if still valid
      const deleted = await Attendance.destroy({
        where: {
          date: todayDate,
          status: "Absent",
        },
      });

      if (deleted > 0) {
        console.log(`🧹 Cleanup job: Removed ${deleted} invalid absent records`);
      }
    } catch (error) {
      console.error("❌ Cleanup job error:", error);
    }
  });

  console.log("⏰ Schedule cleanup job started (runs every hour)");
};
