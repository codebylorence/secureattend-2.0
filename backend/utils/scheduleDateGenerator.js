import { getCurrentDateInTimezone, getDateInTimezone, getConfiguredTimezone } from "./timezone.js";

/**
 * Generate specific dates for schedule assignments (Rolling/Recurring)
 * @param {Array} days - Array of day names (e.g., ['Monday', 'Wednesday'])
 * @param {Date} startDate - Start date for the schedule (optional, defaults to today)
 * @param {Date} endDate - End date for the schedule (optional, defaults to 7 days from start)
 * @returns {Object} - Object with day names as keys and arrays of dates as values
 */
export function generateScheduleDates(days, startDate = null, endDate = null) {
  try {
    const dayNameToNumber = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };

    // Validate inputs
    if (!days || !Array.isArray(days) || days.length === 0) {
      console.error("Invalid days array:", days);
      return {};
    }

    const timezone = getConfiguredTimezone();

    // Helper function to create date in configured timezone
    const createTimezoneDate = (dateInput) => {
      if (dateInput instanceof Date) {
        // Convert to timezone-aware date
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const dateStr = formatter.format(dateInput);
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      // If string, parse as local date (YYYY-MM-DD)
      const [year, month, day] = dateInput.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Use current date in configured timezone as start for rolling schedules
    const start = startDate ? createTimezoneDate(startDate) : (() => {
      const todayStr = getCurrentDateInTimezone();
      const [year, month, day] = todayStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    })();
    start.setHours(0, 0, 0, 0);
    
    // Generate for the next 7 days (current week rolling window)
    const end = endDate ? createTimezoneDate(endDate) : new Date(start);
    if (!endDate) {
      end.setDate(end.getDate() + 6); // 7 days total (today + 6)
    }

    const scheduleDates = {};
    
    // Initialize arrays for each day
    days.forEach(day => {
      scheduleDates[day] = [];
    });

    // Iterate through each date in the range (max 7 days)
    const currentDate = new Date(start);
    let iterations = 0;
    const maxIterations = 7; // Only generate 1 week at a time
    
    while (currentDate <= end && iterations < maxIterations) {
      const dayName = Object.keys(dayNameToNumber).find(
        name => dayNameToNumber[name] === currentDate.getDay()
      );

      // If this day is in the schedule, add the date
      if (days.includes(dayName)) {
        // Format date as YYYY-MM-DD using configured timezone
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        scheduleDates[dayName].push(dateString);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      iterations++;
    }

    console.log(`Generated ${Object.values(scheduleDates).flat().length} dates for current week (${days.length} days) in ${timezone}`);
    return scheduleDates;
  } catch (error) {
    console.error("Error generating schedule dates:", error);
    return {};
  }
}

/**
 * Generate rolling schedule dates dynamically based on current date
 * This ensures schedules always show current and upcoming dates
 * @param {Array} days - Array of day names (e.g., ['Monday', 'Wednesday'])
 * @returns {Object} - Object with day names as keys and arrays of current week dates as values
 */
export function generateRollingScheduleDates(days) {
  // Use timezone-aware current date
  const todayStr = getCurrentDateInTimezone();
  const [year, month, day] = todayStr.split('-').map(Number);
  const today = new Date(year, month - 1, day);
  today.setHours(0, 0, 0, 0);
  
  // Generate for the next 7 days from today
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 6);
  
  return generateScheduleDates(days, today, endDate);
}

/**
 * Get today's schedule for an employee
 * @param {Object} employeeSchedule - Employee schedule object with schedule_dates
 * @returns {Object|null} - Schedule info if employee has schedule today, null otherwise
 */
export function getTodaysSchedule(employeeSchedule) {
  if (!employeeSchedule || !employeeSchedule.schedule_dates) {
    return null;
  }

  // Get today's date in configured timezone (YYYY-MM-DD)
  const today = getCurrentDateInTimezone();
  
  // Get today's day name in configured timezone
  const timezone = getConfiguredTimezone();
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long'
  });
  const todayDayName = formatter.format(now);

  // Check if today's date is in the schedule
  const todaysDates = employeeSchedule.schedule_dates[todayDayName];
  if (todaysDates && todaysDates.includes(today)) {
    return {
      date: today,
      day: todayDayName,
      shift_name: employeeSchedule.template?.shift_name,
      start_time: employeeSchedule.template?.start_time,
      end_time: employeeSchedule.template?.end_time
    };
  }

  return null;
}
