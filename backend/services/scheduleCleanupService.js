import cron from "node-cron";
import EmployeeSchedule from "../models/employeeSchedule.js";
import { Op } from "sequelize";
import { regenerateWeeklySchedules } from "./employeeScheduleService.js";

/**
 * Clean up expired employee schedules
 * Deletes schedules where end_date has passed
 */
export const cleanupExpiredSchedules = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Format as YYYY-MM-DD
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // Delete schedules where end_date is in the past
    const deletedCount = await EmployeeSchedule.destroy({
      where: {
        end_date: {
          [Op.lt]: todayStr
        },
        status: "Active"
      }
    });
    
    if (deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deletedCount} expired schedule(s) at ${new Date().toLocaleString()}`);
    }
  } catch (error) {
    console.error("Error cleaning up expired schedules:", error);
  }
};

/**
 * Start the schedule cleanup and regeneration cron job
 * Runs daily at midnight to check for expired schedules and regenerate weekly schedules
 */
export const startScheduleCleanupJob = () => {
  // Run daily at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("🔄 Running schedule maintenance job...");
    await cleanupExpiredSchedules();
    await regenerateWeeklySchedules();
  });
  
  console.log("✅ Schedule maintenance job started (runs daily at midnight)");
};
