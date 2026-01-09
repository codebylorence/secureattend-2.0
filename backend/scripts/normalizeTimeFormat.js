import sequelize from '../config/database.js';
import ScheduleTemplate from '../models/scheduleTemplate.js';
import { Op } from 'sequelize';

async function normalizeTimeFormat() {
  try {
    console.log('🕐 Starting time format normalization to 24-hour format...');
    
    // Get all schedule templates with time data
    const scheduleTemplates = await ScheduleTemplate.findAll({
      where: {
        [Op.or]: [
          { start_time: { [Op.ne]: null } },
          { end_time: { [Op.ne]: null } }
        ]
      }
    });
    
    console.log(`📊 Found ${scheduleTemplates.length} schedule templates to check`);
    
    // Function to convert 12-hour format to 24-hour format
    const convertTo24Hour = (timeStr) => {
      if (!timeStr) return timeStr;
      
      // If already in 24-hour format (HH:MM), return as is
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
      }
      
      // If in H:MM format, pad with zero
      if (/^\d{1}:\d{2}$/.test(timeStr)) {
        return timeStr.padStart(5, '0');
      }
      
      // Convert 12-hour format to 24-hour format
      const time12HourMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (time12HourMatch) {
        let [, hours, minutes, period] = time12HourMatch;
        hours = parseInt(hours);
        
        if (period.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      
      return timeStr; // Return original if can't parse
    };
    
    let updatedCount = 0;
    
    // Update each schedule template
    for (const template of scheduleTemplates) {
      const newStartTime = convertTo24Hour(template.start_time);
      const newEndTime = convertTo24Hour(template.end_time);
      
      // Only update if there was a change
      if (newStartTime !== template.start_time || newEndTime !== template.end_time) {
        await template.update({
          start_time: newStartTime,
          end_time: newEndTime
        });
        
        console.log(`✅ Updated template ${template.id}: ${template.start_time} -> ${newStartTime}, ${template.end_time} -> ${newEndTime}`);
        updatedCount++;
      }
    }
    
    console.log(`✅ Time format normalization completed. Updated ${updatedCount} schedule templates.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during time format normalization:', error);
    process.exit(1);
  }
}

normalizeTimeFormat();