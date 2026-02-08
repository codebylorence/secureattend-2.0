'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make template_id nullable
    await queryInterface.changeColumn('employee_schedules', 'template_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'DEPRECATED: Reference to ScheduleTemplate (no longer used)'
    });

    // Add shift_name column
    await queryInterface.addColumn('employee_schedules', 'shift_name', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Name of the shift (e.g., Morning Shift, Night Shift)'
    });

    // Add start_time column
    await queryInterface.addColumn('employee_schedules', 'start_time', {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'Shift start time (e.g., 08:00:00)'
    });

    // Add end_time column
    await queryInterface.addColumn('employee_schedules', 'end_time', {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'Shift end time (e.g., 17:00:00)'
    });

    // Add department column
    await queryInterface.addColumn('employee_schedules', 'department', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Department for this schedule'
    });

    console.log('✅ Updated employee_schedules table for direct scheduling');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns
    await queryInterface.removeColumn('employee_schedules', 'department');
    await queryInterface.removeColumn('employee_schedules', 'end_time');
    await queryInterface.removeColumn('employee_schedules', 'start_time');
    await queryInterface.removeColumn('employee_schedules', 'shift_name');

    // Make template_id NOT NULL again
    await queryInterface.changeColumn('employee_schedules', 'template_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Reference to ScheduleTemplate'
    });

    console.log('✅ Reverted employee_schedules table changes');
  }
};
