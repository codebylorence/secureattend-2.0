'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if status column exists before trying to remove it
    const tableDescription = await queryInterface.describeTable('Positions');
    
    if (tableDescription.status) {
      await queryInterface.removeColumn('Positions', 'status');
      console.log('✅ Removed status column from Positions table');
    } else {
      console.log('⏭️  Status column does not exist in Positions table');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add the status column if we need to rollback
    await queryInterface.addColumn('Positions', 'status', {
      type: Sequelize.ENUM('Active', 'Inactive'),
      defaultValue: 'Active',
      allowNull: true
    });
  }
};
