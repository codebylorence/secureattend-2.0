import sequelize from '../config/database.js';
import User from '../models/user.js';
import Employee from '../models/employee.js';
import '../models/associations.js';

async function testEmployeeAttendanceAccess() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find Lorence's user account
    const lorence = await User.findOne({
      where: { username: 'Lorence' },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'employee_id', 'firstname', 'lastname', 'position', 'department']
      }]
    });

    if (!lorence) {
      console.log('❌ Lorence user not found');
      return;
    }

    console.log('\n👤 Lorence User Account:');
    console.log(`  - User ID: ${lorence.id}`);
    console.log(`  - Username: ${lorence.username}`);
    console.log(`  - Role: ${lorence.role}`);
    console.log(`  - employeeId (FK): ${lorence.employeeId}`);

    if (lorence.employee) {
      console.log('\n👤 Lorence Employee Record:');
      console.log(`  - Employee.id (auto-increment): ${lorence.employee.id}`);
      console.log(`  - Employee.employee_id (string): ${lorence.employee.employee_id}`);
      console.log(`  - Name: ${lorence.employee.firstname} ${lorence.employee.lastname}`);
      console.log(`  - Position: ${lorence.employee.position}`);
      console.log(`  - Department: ${lorence.employee.department}`);
    } else {
      console.log('\n❌ No employee record linked to Lorence user');
    }

    // Verify the relationship
    if (lorence.employeeId === lorence.employee?.id) {
      console.log('\n✅ User.employeeId correctly points to Employee.id');
      console.log(`✅ This means Lorence's attendance should be filtered by employee_id: ${lorence.employee.employee_id}`);
    } else {
      console.log('\n❌ User.employeeId does NOT match Employee.id - relationship is broken!');
    }

    // Check all employees with role "employee"
    console.log('\n\n📊 All users with role "employee":');
    const allEmployeeUsers = await User.findAll({
      where: { role: 'employee' },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['id', 'employee_id', 'firstname', 'lastname']
      }]
    });

    allEmployeeUsers.forEach(user => {
      const empId = user.employee?.employee_id || 'NO EMPLOYEE LINKED';
      const match = user.employeeId === user.employee?.id ? '✅' : '❌';
      console.log(`  ${match} ${user.username} (User.employeeId: ${user.employeeId}) → ${empId}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testEmployeeAttendanceAccess();
