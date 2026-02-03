import User from "../models/user.js";
import Employee from "../models/employee.js";

const fixCharlesUser = async () => {
  try {
    console.log('🔧 Fixing Charles user record...');
    
    // Find Charles user
    const charlesUser = await User.findOne({
      where: { username: 'Charles' }
    });
    
    if (!charlesUser) {
      console.log('❌ Charles user not found');
      return;
    }
    
    console.log('👤 Found Charles user:', {
      id: charlesUser.id,
      username: charlesUser.username,
      role: charlesUser.role,
      employeeId: charlesUser.employeeId
    });
    
    // Find Charles employee
    const charlesEmployee = await Employee.findOne({
      where: { 
        firstname: 'Charles',
        lastname: 'Lopez'
      }
    });
    
    if (!charlesEmployee) {
      console.log('❌ Charles employee not found');
      return;
    }
    
    console.log('👷 Found Charles employee:', {
      employee_id: charlesEmployee.employee_id,
      name: `${charlesEmployee.firstname} ${charlesEmployee.lastname}`,
      department: charlesEmployee.department,
      position: charlesEmployee.position
    });
    
    // Update user to link to correct employee
    await charlesUser.update({
      employeeId: charlesEmployee.employee_id
    });
    
    console.log('✅ Updated Charles user employeeId from', charlesUser.employeeId, 'to', charlesEmployee.employee_id);
    
    // Verify the fix
    const updatedUser = await User.findByPk(charlesUser.id);
    console.log('🔍 Verification - Updated user:', {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      employeeId: updatedUser.employeeId
    });
    
  } catch (error) {
    console.error('❌ Error fixing Charles user:', error);
  }
};

fixCharlesUser();