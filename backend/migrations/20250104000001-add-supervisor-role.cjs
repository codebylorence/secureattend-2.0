'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For MySQL, we need to modify the ENUM by recreating it
    await queryInterface.sequelize.query(`
      ALTER TABLE Users MODIFY COLUMN role ENUM('admin', 'supervisor', 'teamleader', 'employee') DEFAULT 'employee';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback to original ENUM (remove supervisor)
    await queryInterface.sequelize.query(`
      ALTER TABLE Users MODIFY COLUMN role ENUM('admin', 'teamleader', 'employee') DEFAULT 'employee';
    `);
  }
};