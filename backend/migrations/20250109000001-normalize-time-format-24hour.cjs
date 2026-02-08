'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🕐 Starting time format normalization to 24-hour format...');
    
    try {
      // DISABLED: ScheduleTemplates table has been dropped
      // Skip this migration as the table no longer exists
      console.log('⚠️ Skipping: ScheduleTemplates table has been dropped');
      console.log('✅ Migration skipped successfully');
      
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