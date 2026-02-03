import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

async function updateWarehouseRoles() {
  try {
    console.log('🔄 Updating warehouse positions to warehouseadmin role...');
    
    const [results] = await sequelize.query(`
      UPDATE users 
      SET role = 'warehouseadmin' 
      WHERE employeeId IN (
        SELECT id FROM employees 
        WHERE position IN ('Warehouse Admin', 'Warehouse Manager', 'Inventory Manager')
      ) AND role != 'warehouseadmin'
    `);
    
    console.log(`✅ Updated ${results.affectedRows || 0} users to warehouseadmin role`);
    
    const [updatedUsers] = await sequelize.query(`
      SELECT u.id, u.username, u.role, e.employee_id, e.position, e.fullname
      FROM users u
      JOIN employees e ON u.employeeId = e.id
      WHERE u.role = 'warehouseadmin'
    `);
    
    console.log('📋 Current warehouse admin users:');
    updatedUsers.forEach(user => {
      console.log(`  - ${user.fullname} (${user.employee_id}) - ${user.position} - Role: ${user.role}`);
    });
    
    await sequelize.close();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

updateWarehouseRoles();