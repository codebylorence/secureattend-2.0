'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Attendances', 'is_archived', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
    await queryInterface.addColumn('Attendances', 'archived_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('Attendances', 'archived_by', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Attendances', 'is_archived');
    await queryInterface.removeColumn('Attendances', 'archived_at');
    await queryInterface.removeColumn('Attendances', 'archived_by');
  }
};
