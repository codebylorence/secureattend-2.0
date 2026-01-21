import sequelize from '../config/database.js';
import Employee from '../models/employee.js';
import User from '../models/user.js';

async function updateAdminSupervisorDepartments() {
  try {
    console.log('🔄 Starting department update for admin and supervisor users...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Find all users with admin or supervisor roles
    const adminSupervisorUsers = await User.findAll({
      where: {
        role: ['admin', 'supervisor']
      }
    });
    
    console.log(`📊 Found ${adminSupervisorUsers.length} admin/supervisor users`);
    
    let updatedCount = 0;
    
    for (const user of adminSupervisorUsers) {
      if (user.employeeId) {
        // Find the associated employee
        const employee = await Employee.findByPk(user.employeeId);
        
        if (employee) {
          // Update department to "Company-wide" if it's null or empty
          if (!employee.department || employee.department.trim() === '') {
            await employee.update({
              department: 'Company-wide'
            });
            
            console.log(`✅ Updated ${employee.firstname} ${employee.lastname} (${employee.employee_id}) - Role: ${user.role}`);
            updatedCount++;
          } else {
            console.log(`⏭️  Skipped ${employee.firstname} ${employee.lastname} (${employee.employee_id}) - Already has department: ${employee.department}`);
          }
        }
      }
    }
    
    // Also update employees based on position (for cases where role might not be set correctly)
    const adminSupervisorPositions = await Employee.findAll({
      where: {
        position: {
          [sequelize.Sequelize.Op.or]: [
            { [sequelize.Sequelize.Op.like]: '%admin%' },
            { [sequelize.Sequelize.Op.like]: '%supervisor%' },
            { [sequelize.Sequelize.Op.like]: '%manager%' }
          ]
        },
        department: {
          [sequelize.Sequelize.Op.or]: [
            { [sequelize.Sequelize.Op.is]: null },
            { [sequelize.Sequelize.Op.eq]: '' }
          ]
        }
      }
    });
    
    console.log(`📊 Found ${adminSupervisorPositions.length} employees with admin/supervisor/manager positions and no department`);
    
    for (const employee of adminSupervisorPositions) {
      await employee.update({
        department: 'Company-wide'
      });
      
      console.log(`✅ Updated ${employee.firstname} ${employee.lastname} (${employee.employee_id}) - Position: ${employee.position}`);
      updatedCount++;
    }
    
    console.log(`🎉 Department update completed! Updated ${updatedCount} employee(s) to "Company-wide"`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Department update failed:', error);
    process.exit(1);
  }
}

updateAdminSupervisorDepartments();