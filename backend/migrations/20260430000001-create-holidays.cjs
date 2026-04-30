'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Holidays', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('Regular Holiday', 'Special Non-Working Day'),
        allowNull: false,
        defaultValue: 'Regular Holiday',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Unique constraint: one holiday per date
    await queryInterface.addIndex('Holidays', ['date'], { unique: true });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Holidays');
  },
};
