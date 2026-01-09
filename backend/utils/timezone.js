import fs from 'fs';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'system-config.json');

// Load system configuration to get timezone
const loadConfig = () => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(configData);
    }
    return { timezone: 'UTC' }; // Default fallback
  } catch (error) {
    console.error('Error loading timezone config:', error);
    return { timezone: 'UTC' }; // Default fallback
  }
};

/**
 * Get the current date in the configured timezone
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getCurrentDateInTimezone = () => {
  try {
    const config = loadConfig();
    const timezone = config.timezone || 'UTC';
    
    const now = new Date();
    
    // Use Intl.DateTimeFormat to get date in the configured timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const dateString = formatter.format(now);
    console.log(`🌍 Current date in ${timezone}: ${dateString} (UTC: ${now.toISOString().split('T')[0]})`);
    
    return dateString;
  } catch (error) {
    console.error('Error getting current date in timezone:', error);
    // Fallback to UTC date
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
};

/**
 * Get a date in the configured timezone
 * @param {Date} date - The date to convert (should be in UTC)
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getDateInTimezone = (date) => {
  try {
    const config = loadConfig();
    const timezone = config.timezone || 'UTC';
    
    console.log(`🌍 Converting date to ${timezone}: input=${date.toISOString()}`);
    
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const result = formatter.format(date);
    console.log(`🌍 Converted date result: ${result}`);
    
    return result;
  } catch (error) {
    console.error('Error getting date in timezone:', error);
    // Fallback to UTC date
    return date.toISOString().split('T')[0];
  }
};

/**
 * Get the current time in the configured timezone
 * @returns {string} Time in HH:MM:SS format
 */
export const getCurrentTimeInTimezone = () => {
  try {
    const config = loadConfig();
    const timezone = config.timezone || 'UTC';
    
    const now = new Date();
    
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return formatter.format(now);
  } catch (error) {
    console.error('Error getting current time in timezone:', error);
    // Fallback to UTC time
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  }
};

/**
 * Get the configured timezone
 * @returns {string} Timezone identifier (e.g., 'Asia/Manila')
 */
export const getConfiguredTimezone = () => {
  try {
    const config = loadConfig();
    return config.timezone || 'UTC';
  } catch (error) {
    console.error('Error getting configured timezone:', error);
    return 'UTC';
  }
};