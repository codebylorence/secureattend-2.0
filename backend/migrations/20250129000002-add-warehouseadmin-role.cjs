module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add warehouseadmin to the enum type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Users_role" ADD VALUE 'warehouseadmin';
    `);
    
    console.log('✅ Added warehouseadmin role to enum');
  },

  down: async (queryInterface, Sequelize) => {
    // Note: Cannot remove enum values in PostgreSQL easily
    console.log('Warning: Cannot remove enum value "warehouseadmin" from PostgreSQL enum type');
  }
};