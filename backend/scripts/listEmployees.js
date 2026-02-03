import Employee from "../models/employee.js";

const listEmployees = async () => {
  try {
    const employees = await Employee.findAll({
      order: [['employee_id', 'ASC']]
    });
    
    console.log(`📋 Found ${employees.length} employees:`);
    employees.forEach(emp => {
      console.log(`  ${emp.employee_id}: ${emp.firstname} ${emp.lastname} (${emp.department}) - ${emp.position}`);
    });
    
    // Check specifically for employee_id 8
    const emp8 = employees.find(e => e.employee_id === '8');
    if (emp8) {
      console.log('\n✅ Employee ID 8 found:', emp8.firstname, emp8.lastname);
    } else {
      console.log('\n❌ Employee ID 8 not found');
      
      // Check for similar IDs
      const similar = employees.filter(e => e.employee_id.includes('8'));
      if (similar.length > 0) {
        console.log('🔍 Similar employee IDs containing "8":');
        similar.forEach(emp => {
          console.log(`  ${emp.employee_id}: ${emp.firstname} ${emp.lastname}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error listing employees:', error);
  }
};

listEmployees();