'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🗑️ Removing fullname column from Employees table...');
      
      // Check if the column exists before trying to remove it
      const tableDescription = await queryInterface.describeTable('Employees');
      
      if (tableDescription.fullname) {
        await queryInterface.removeColumn('Employees', 'fullname');
        console.log('✅ Successfully removed fullname column from Employees table');
      } else {
        console.log('ℹ️ fullname column does not exist in Employees table, skipping...');
      }
    } catch (error) {
      console.error('❌ Error removing fullname column:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🔄 Adding back fullname column to Employees table...');
      
      await queryInterface.addColumn('Employees', 'fullname', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Full name field (restored by rollback)'
      });
      
      console.log('✅ Successfully added back fullname column to Employees table');
    } catch (error) {
      console.error('❌ Error adding back fullname column:', error);
      throw error;
    }
  }
};