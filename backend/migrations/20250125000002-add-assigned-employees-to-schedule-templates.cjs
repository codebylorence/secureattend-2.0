'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('schedule_templates', 'assigned_employees', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: "Array of employee assignments: [{employee_id: 'TSI00123', assigned_date: '2025-01-25', assigned_by: 'admin'}]"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('schedule_templates', 'assigned_employees');
  }
};