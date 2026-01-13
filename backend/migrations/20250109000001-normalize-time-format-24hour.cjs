'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🕐 Starting time format normalization to 24-hour format...');
    
    try {
      // Get all schedule templates with time data
      const scheduleTemplates = await queryInterface.sequelize.query(
        'SELECT id, start_time, end_time FROM ScheduleTemplates WHERE start_time IS NOT NULL OR end_time IS NOT NULL',
        { type: Sequelize.QueryTypes.SELECT }
      );
      
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
          await queryInterface.sequelize.query(
            'UPDATE ScheduleTemplates SET start_time = ?, end_time = ?, updated_at = NOW() WHERE id = ?',
            {
              replacements: [newStartTime, newEndTime, template.id],
              type: Sequelize.QueryTypes.UPDATE
            }
          );
          
          console.log(`✅ Updated template ${template.id}: ${template.start_time} -> ${newStartTime}, ${template.end_time} -> ${newEndTime}`);
          updatedCount++;
        }
      }
      
      // Also check and update any other tables that might have time fields
      // Check if there are any other time-related columns in other tables
      const tables = await queryInterface.sequelize.query(
        "SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%time%' AND table_schema = DATABASE()",
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log(`📋 Found time-related columns in tables:`, tables.map(t => `${t.table_name}.${t.column_name}`));
      
      console.log(`✅ Time format normalization completed. Updated ${updatedCount} schedule templates.`);
      
    } catch (error) {
      console.error('❌ Error during time format normalization:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️ Rollback: Time format normalization cannot be automatically reversed.');
    console.log('⚠️ Manual intervention may be required if you need to revert time formats.');
    // Note: We don't automatically revert because we don't know the original format
    // and converting back could cause data loss or inconsistency
  }
};