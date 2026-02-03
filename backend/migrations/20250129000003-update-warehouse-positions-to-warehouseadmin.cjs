'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Updating warehouse positions to warehouseadmin role...');
    
    try {
      // Update users with warehouse positions to have warehouseadmin role
      const [results] = await queryInterface.sequelize.query(`
        UPDATE users 
        SET role = 'warehouseadmin' 
        WHERE employeeId IN (
          SELECT id FROM employees 
          WHERE position IN ('Warehouse Admin', 'Warehouse Manager', 'Inventory Manager')
        ) AND role != 'warehouseadmin'
      `);
      
      console.log(`✅ Updated ${results.affectedRows || 0} users to warehouseadmin role`);
      
      // Log the updated users
      const [updatedUsers] = await queryInterface.sequelize.query(`
        SELECT u.id, u.username, u.role, e.employee_id, e.position, e.fullname
        FROM users u
        JOIN employees e ON u.employeeId = e.id
        WHERE u.role = 'warehouseadmin'
      `);
      
      console.log('📋 Current warehouse admin users:');
      updatedUsers.forEach(user => {
        console.log(`  - ${user.fullname} (${user.employee_id}) - ${user.position} - Role: ${user.role}`);
      });
      
    } catch (error) {
      console.error('❌ Error updating warehouse positions:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting warehouse admin roles to admin...');
    
    try {
      // Revert warehouseadmin roles back to admin
      const [results] = await queryInterface.sequelize.query(`
        UPDATE users 
        SET role = 'admin' 
        WHERE role = 'warehouseadmin'
      `);
      
      console.log(`✅ Reverted ${results.affectedRows || 0} users back to admin role`);
      
    } catch (error) {
      console.error('❌ Error reverting warehouse admin roles:', error);
      throw error;
    }
  }
};