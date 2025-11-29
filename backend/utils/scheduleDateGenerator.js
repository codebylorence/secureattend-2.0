/**
 * Generate specific dates for schedule assignments
 * @param {Array} days - Array of day names (e.g., ['Monday', 'Wednesday'])
 * @param {Date} startDate - Start date for the schedule
 * @param {Date} endDate - End date for the schedule (optional, defaults to 3 months)
 * @returns {Object} - Object with day names as keys and arrays of dates as values
 */
export function generateScheduleDates(days, startDate, endDate = null) {
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

    // Helper function to create date in local timezone without UTC conversion
    const createLocalDate = (dateInput) => {
      if (dateInput instanceof Date) {
        return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
      }
      // If string, parse as local date (YYYY-MM-DD)
      const [year, month, day] = dateInput.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Ensure startDate is a Date object in local timezone
    const start = createLocalDate(startDate);
    
    // Generate only for the current week (7 days from start date)
    let end = endDate;
    if (!end) {
      end = new Date(start);
      end.setDate(end.getDate() + 6); // 7 days total (today + 6)
    } else {
      end = createLocalDate(endDate);
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
        // Format date as YYYY-MM-DD using local timezone
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

    console.log(`Generated ${Object.values(scheduleDates).flat().length} dates for current week (${days.length} days)`);
    return scheduleDates;
  } catch (error) {
    console.error("Error generating schedule dates:", error);
    return {};
  }
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

  // Get today's date in local timezone (YYYY-MM-DD)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[now.getDay()];

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
