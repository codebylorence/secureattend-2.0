'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Attendances', 'is_permanently_deleted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Tombstone flag - prevents biometric sync from recreating this record'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Attendances', 'is_permanently_deleted');
  }
};
