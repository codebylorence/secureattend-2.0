'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('schedule_templates', 'specific_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Specific date for this schedule (YYYY-MM-DD format)'
    });

    // Make days column nullable since we're moving to specific_date
    await queryInterface.changeColumn('schedule_templates', 'days', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: "Array of day names: ['Monday', 'Tuesday', ...] - DEPRECATED, use specific_date instead"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('schedule_templates', 'specific_date');
    
    // Revert days column back to not nullable
    await queryInterface.changeColumn('schedule_templates', 'days', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
      comment: "Array of day names: ['Monday', 'Tuesday', ...]"
    });
  }
};