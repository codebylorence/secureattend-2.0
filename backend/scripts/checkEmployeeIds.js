import Employee from "../models/employee.js";

const checkEmployeeIds = async () => {
  try {
    const employees = await Employee.findAll({
      attributes: ['id', 'employee_id', 'firstname', 'lastname', 'department'],
      order: [['id', 'ASC']]
    });
    
    console.log(`📋 Employee ID mapping:`);
    employees.forEach(emp => {
      console.log(`  DB ID: ${emp.id} -> Employee ID: ${emp.employee_id} (${emp.firstname} ${emp.lastname} - ${emp.department})`);
    });
    
    // Find Charles Lopez
    const charles = employees.find(e => e.firstname === 'Charles' && e.lastname === 'Lopez');
    if (charles) {
      console.log(`\n✅ Charles Lopez: DB ID = ${charles.id}, Employee ID = ${charles.employee_id}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking employee IDs:', error);
  }
};

checkEmployeeIds();