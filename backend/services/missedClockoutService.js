import Attendance from "../models/attendance.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import { getCurrentDateInTimezone, getConfiguredTimezone } from "../utils/timezone.js";
import { Op } from "sequelize";
import sequelize from "../config/database.js";
import fs from 'fs';
import path from 'path';

/**
 * Marks employees as "Missed Clock-out" if they:
 * 1. Have clocked in today (Present or Late status)
 * 2. Have not clocked out yet (clock_out is null)
 * 3. Their shift has ended + grace period has passed
 */
export async function markMissedClockouts() {
  try {
    const today = getCurrentDateInTimezone();
    const timezone = getConfiguredTimezone();
    
    // Get current time in configured timezone (HH:mm format)
    const now = new Date();
    const currentTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);
    
    console.log(`🕐 [Missed Clock-out Check] Starting check for ${today} at ${currentTime} (${timezone})`);
    
    // Get grace period from system config
    const configPath = path.join(process.cwd(), 'config', 'system-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const gracePeriodMinutes = config.clockOutGracePeriodMinutes || 30;
    
    console.log(`⏰ Grace period: ${gracePeriodMinutes} minutes`);
    
    // Step 1: Find all employees who clocked in but haven't clocked out yet
    const openSessions = await Attendance.findAll({
      where: {
        date: today,
        status: {
          [Op.in]: ["Present", "Late"]
        },
        clock_in: {
          [Op.not]: null
        },
        clock_out: null
      }
    });
    
    console.log(`📊 Found ${openSessions.length} open sessions (clocked in, not clocked out)`);
    
    if (openSessions.length === 0) {
      console.log(`✅ No open sessions to check`);
      return { marked: 0, checked: 0 };
    }
    
    let markedCount = 0;
    let checkedCount = 0;
    
    // Step 2: For each open session, check if their shift has ended
    for (const session of openSessions) {
      checkedCount++;
      
      // Get employee's schedule for today
      const schedule = await EmployeeSchedule.findOne({
        where: {
          employee_id: session.employee_id,
          status: 'Active',
          [Op.or]: [
            sequelize.literal(`schedule_dates::text LIKE '%${today}%'`)
          ]
        }
      });
      
      if (!schedule) {
        console.log(`  ⚠️ ${session.employee_id}: No schedule found for today, skipping`);
        continue;
      }
      
      if (!schedule.shift_end) {
        console.log(`  ⚠️ ${session.employee_id}: No shift_end time in schedule, skipping`);
        continue;
      }
      
      // Check if shift has ended + grace period
      const shiftEndTime = schedule.shift_end; // Format: "HH:mm"
      const hasShiftEnded = hasShiftEndedWithGracePeriod(shiftEndTime, currentTime, gracePeriodMinutes);
      
      console.log(`  📋 ${session.employee_id}: Shift ends at ${shiftEndTime}, current ${currentTime}, ended+grace: ${hasShiftEnded}`);
      
      if (hasShiftEnded) {
        // Mark as missed clock-out
        session.status = "Missed Clock-out";
        await session.save();
        markedCount++;
        
        console.log(`  🕐 ${session.employee_id}: Marked as Missed Clock-out (shift ended at ${shiftEndTime})`);
      } else {
        console.log(`  ✅ ${session.employee_id}: Shift still active or within grace period`);
      }
    }
    
    console.log(`✅ [Missed Clock-out Check] Complete: ${markedCount} marked out of ${checkedCount} checked`);
    
    return { marked: markedCount, checked: checkedCount };
    
  } catch (error) {
    console.error("❌ Error in markMissedClockouts:", error);
    throw error;
  }
}

/**
 * Checks if shift has ended + grace period has passed
 * @param {string} shiftEndTime - Shift end time in "HH:mm" format (e.g., "17:00")
 * @param {string} currentTime - Current time in "HH:mm" format (e.g., "17:35")
 * @param {number} gracePeriodMinutes - Grace period in minutes
 * @returns {boolean} - True if shift ended + grace period passed
 */
function hasShiftEndedWithGracePeriod(shiftEndTime, currentTime, gracePeriodMinutes) {
  try {
    // Parse times
    const [shiftHour, shiftMin] = shiftEndTime.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    
    // Convert to minutes since midnight
    const shiftEndMinutes = shiftHour * 60 + shiftMin;
    const currentMinutes = currentHour * 60 + currentMin;
    
    // Add grace period to shift end time
    const shiftEndWithGrace = shiftEndMinutes + gracePeriodMinutes;
    
    // Check if current time is past shift end + grace period
    return currentMinutes >= shiftEndWithGrace;
    
  } catch (error) {
    console.error(`❌ Error parsing times: shiftEndTime=${shiftEndTime}, currentTime=${currentTime}`, error);
    return false;
  }
}

/**
 * Starts the missed clock-out marking job
 * Runs every 5 minutes to check for missed clock-outs
 */
export function startMissedClockoutJob() {
  console.log("🚀 Starting missed clock-out marking job (runs every 5 minutes)");
  
  // Run immediately on startup
  markMissedClockouts().catch(error => {
    console.error("❌ Error in initial missed clock-out check:", error);
  });
  
  // Then run every 5 minutes
  setInterval(async () => {
    try {
      await markMissedClockouts();
    } catch (error) {
      console.error("❌ Error in scheduled missed clock-out check:", error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}
