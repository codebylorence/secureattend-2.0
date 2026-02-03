module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, update any existing superadmin users to admin
    await queryInterface.sequelize.query(`
      UPDATE "Users" SET role = 'admin' WHERE role = 'superadmin';
    `);
    
    // Note: In PostgreSQL, we cannot remove enum values directly
    // The enum value 'superadmin' will remain in the type definition
    // but won't be used by the application
    console.log('✅ Updated all superadmin users to admin role');
  },

  down: async (queryInterface, Sequelize) => {
    // This migration is not easily reversible since we've converted superadmin to admin
    console.log('Warning: Cannot revert superadmin role removal - users were converted to admin');
  }
};