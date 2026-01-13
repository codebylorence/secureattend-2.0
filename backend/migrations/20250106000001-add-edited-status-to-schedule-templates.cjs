'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('schedule_templates', 'is_edited', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'True when this draft is an edit of an existing published schedule'
    });

    await queryInterface.addColumn('schedule_templates', 'original_template_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID of the original published template that this draft is editing',
      references: {
        model: 'schedule_templates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('schedule_templates', 'edited_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when the schedule was last edited'
    });

    await queryInterface.addColumn('schedule_templates', 'edited_by', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Employee ID who last edited the schedule'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('schedule_templates', 'is_edited');
    await queryInterface.removeColumn('schedule_templates', 'original_template_id');
    await queryInterface.removeColumn('schedule_templates', 'edited_at');
    await queryInterface.removeColumn('schedule_templates', 'edited_by');
  }
};