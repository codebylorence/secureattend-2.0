'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the level column exists before trying to remove it
      const tableDescription = await queryInterface.describeTable('Positions');
      
      if (tableDescription.level) {
        console.log('🗑️ Removing level column from Positions table...');
        await queryInterface.removeColumn('Positions', 'level');
        console.log('✅ Level column removed successfully');
      } else {
        console.log('⏭️ Level column does not exist, skipping removal');
      }
    } catch (error) {
      console.error('❌ Error removing level column:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Adding level column back to Positions table...');
      await queryInterface.addColumn('Positions', 'level', {
        type: Sequelize.ENUM("Entry", "Junior", "Senior", "Lead", "Manager", "Director", "Executive"),
        defaultValue: "Entry",
        allowNull: true
      });
      console.log('✅ Level column added back successfully');
    } catch (error) {
      console.error('❌ Error adding level column back:', error);
      throw error;
    }
  }
};