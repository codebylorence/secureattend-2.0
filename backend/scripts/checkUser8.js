import User from "../models/user.js";
import Employee from "../models/employee.js";

const checkUser8 = async () => {
  try {
    console.log('🔍 Checking user ID 8...');
    
    const user = await User.findByPk(8);
    
    if (user) {
      console.log('👤 User found:', {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId
      });
      
      // Try to find employee by employeeId (which should be the DB ID)
      if (user.employeeId) {
        const employee = await Employee.findByPk(user.employeeId);
        
        if (employee) {
          console.log('👷 Employee found by DB ID:', {
            id: employee.id,
            employee_id: employee.employee_id,
            name: `${employee.firstname} ${employee.lastname}`,
            department: employee.department,
            position: employee.position,
            status: employee.status
          });
        } else {
          console.log('❌ No employee found with DB ID:', user.employeeId);
        }
      } else {
        console.log('⚠️ User has no employeeId');
      }
    } else {
      console.log('❌ User ID 8 not found');
    }
    
  } catch (error) {
    console.error('❌ Error checking user 8:', error);
  }
};

checkUser8();