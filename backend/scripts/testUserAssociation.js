import User from "../models/user.js";
import Employee from "../models/employee.js";
// Import associations
import "../models/associations.js";

const testUserAssociation = async () => {
  try {
    console.log('🧪 Testing User-Employee association...');
    
    const user = await User.findByPk(8, {
      include: [{
        model: Employee,
        as: "employee",
        required: false
      }]
    });
    
    if (user) {
      console.log('👤 User found:', {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId
      });
      
      if (user.employee) {
        console.log('👷 Associated employee:', {
          id: user.employee.id,
          employee_id: user.employee.employee_id,
          name: `${user.employee.firstname} ${user.employee.lastname}`,
          department: user.employee.department,
          position: user.employee.position
        });
      } else {
        console.log('❌ No associated employee found');
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error testing association:', error);
  }
};

testUserAssociation();