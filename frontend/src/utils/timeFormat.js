/**
 * Utility functions for consistent 24-hour time formatting across the app
 */

/**
 * Format time string to 24-hour format (HH:MM:SS)
 * @param {string} timeString - Time string in various formats
 * @returns {string} - Time in HH:MM:SS format
 */
export const formatTime24 = (timeString) => {
  if (!timeString) return "-";
  
  try {
    // If it's already in HH:MM:SS format, return as is
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If it's in HH:MM format, add seconds
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString + ":00";
    }
    
    // If it's in H:MM format, pad with zero and add seconds
    if (/^\d{1}:\d{2}$/.test(timeString)) {
      return timeString.padStart(5, '0') + ":00";
    }
    
    // If it's a Date object or ISO string, parse and format
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });
    }
    
    // If it's in 12-hour format, convert to 24-hour
    const time12HourMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (time12HourMatch) {
      let [, hours, minutes, seconds, period] = time12HourMatch;
      hours = parseInt(hours);
      seconds = seconds || '00';
      
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
    }
    
    return timeString; // Return original if can't parse
  } catch (error) {
    console.warn('Error formatting time:', timeString, error);
    return timeString;
  }
};

/**
 * Format datetime string to 24-hour time format
 * @param {string} dateTimeString - DateTime string (ISO format or Date string)
 * @returns {string} - Time in HH:MM:SS format
 */
export const formatDateTime24 = (dateTimeString) => {
  if (!dateTimeString) return "-";
  
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return "-";
    
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  } catch (error) {
    console.warn('Error formatting datetime:', dateTimeString, error);
    return "-";
  }
};

/**
 * Format time range to 24-hour format without seconds (for schedules)
 * @param {string} startTime - Start time string
 * @param {string} endTime - End time string
 * @returns {string} - Time range in "HH:MM - HH:MM" format
 */
export const formatTimeRange24 = (startTime, endTime) => {
  const start = formatTime24Short(startTime);
  const end = formatTime24Short(endTime);
  return `${start} - ${end}`;
};

/**
 * Format time range to 24-hour format with seconds (for attendance records)
 * @param {string} startTime - Start time string
 * @param {string} endTime - End time string
 * @returns {string} - Time range in "HH:MM:SS - HH:MM:SS" format
 */
export const formatTimeRange24Full = (startTime, endTime) => {
  const start = formatTime24(startTime);
  const end = formatTime24(endTime);
  return `${start} - ${end}`;
};

/**
 * Format time string to 24-hour format without seconds (HH:MM) - for schedule displays
 * @param {string} timeString - Time string in various formats
 * @returns {string} - Time in HH:MM format
 */
export const formatTime24Short = (timeString) => {
  if (!timeString) return "-";
  
  try {
    // If it's already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If it's in HH:MM:SS format, remove seconds
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString.substring(0, 5);
    }
    
    // If it's in H:MM format, pad with zero
    if (/^\d{1}:\d{2}$/.test(timeString)) {
      return timeString.padStart(5, '0');
    }
    
    // If it's a Date object or ISO string, parse and format
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }
    
    // If it's in 12-hour format, convert to 24-hour
    const time12HourMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (time12HourMatch) {
      let [, hours, minutes, , period] = time12HourMatch;
      hours = parseInt(hours);
      
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return timeString; // Return original if can't parse
  } catch (error) {
    console.warn('Error formatting time:', timeString, error);
    return timeString;
  }
};