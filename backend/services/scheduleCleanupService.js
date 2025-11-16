import cron from "node-cron";
import Schedule from "../models/schedule.js";
import { Op } from "sequelize";

/**
 * Convert 12-hour time format to minutes since midnight
 * @param {string} time - Time in format "HH:MM AM/PM"
 * @returns {number} - Minutes since midnight
 */
const timeToMinutes = (time) => {
  const [timePart, period] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);
  
  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
};

/**
 * Get current day of week
 * @returns {string} - Day name (e.g., "Monday")
 */
const getCurrentDay = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
};

/**
 * Get current time in minutes since midnight
 * @returns {number} - Minutes since midnight
 */
const getCurrentTimeInMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Clean up expired schedules
 * Deletes non-template schedules where:
 * 1. The shift has ended (current time > end_time)
 * 2. The current day is in the schedule's days array
 */
export const cleanupExpiredSchedules = async () => {
  try {
    const now = new Date();
    const currentDay = getCurrentDay();
    const currentTimeMinutes = getCurrentTimeInMinutes();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get all non-template schedules
    const schedules = await Schedule.findAll({
      where: {
        is_template: false,
        status: "Active"
      }
    });
    
    const expiredScheduleIds = [];
    
    for (const schedule of schedules) {
      let shouldDelete = false;
      
      // If schedule has a specific date, check if it's today and time has passed
      if (schedule.schedule_date) {
        const scheduleDate = new Date(schedule.schedule_date).toISOString().split('T')[0];
        
        if (scheduleDate === todayStr) {
          const endTimeMinutes = timeToMinutes(schedule.end_time);
          if (currentTimeMinutes > endTimeMinutes) {
            shouldDelete = true;
          }
        } else if (scheduleDate < todayStr) {
          // Past date, delete it
          shouldDelete = true;
        }
      } else {
        // Legacy: Check if current day is in the schedule's days (old recurring logic)
        if (schedule.days.includes(currentDay)) {
          const endTimeMinutes = timeToMinutes(schedule.end_time);
          if (currentTimeMinutes > endTimeMinutes) {
            shouldDelete = true;
          }
        }
      }
      
      if (shouldDelete) {
        expiredScheduleIds.push(schedule.id);
      }
    }
    
    if (expiredScheduleIds.length > 0) {
      const deletedCount = await Schedule.destroy({
        where: {
          id: {
            [Op.in]: expiredScheduleIds
          }
        }
      });
      
      console.log(`🗑️  Cleaned up ${deletedCount} expired schedule(s) at ${new Date().toLocaleString()}`);
    }
  } catch (error) {
    console.error("Error cleaning up expired schedules:", error);
  }
};

/**
 * Start the schedule cleanup cron job
 * Runs every 30 minutes to check for expired schedules
 */
export const startScheduleCleanupJob = () => {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log("🔄 Running schedule cleanup job...");
    await cleanupExpiredSchedules();
  });
  
  console.log("✅ Schedule cleanup job started (runs every 30 minutes)");
};
