import Employee from "../models/employee.js";
import User from "../models/user.js";

async function checkEmployeeEmails() {
  try {
    console.log("📧 Checking Employee Email Addresses...\n");

    const employees = await Employee.findAll({
      order: [['employee_id', 'ASC']]
    });

    console.log(`Found ${employees.length} employees:\n`);

    let withEmail = 0;
    let withoutEmail = 0;
    let withUserAccount = 0;

    for (const emp of employees) {
      // Find user account for this employee
      const user = await User.findOne({
        where: { employeeId: emp.id }
      });
      
      const hasEmail = emp.email && emp.email !== '';
      const hasUser = user !== null;
      
      if (hasEmail) withEmail++;
      else withoutEmail++;
      
      if (hasUser) withUserAccount++;

      const emailStatus = hasEmail ? `✅ ${emp.email}` : '❌ No email';
      const userStatus = hasUser ? `✅ Has account (${user.username})` : '❌ No account';
      
      console.log(`${emp.employee_id} - ${emp.firstname} ${emp.lastname}`);
      console.log(`  Email: ${emailStatus}`);
      console.log(`  User Account: ${userStatus}`);
      console.log('');
    }

    console.log('📊 Summary:');
    console.log(`  Total Employees: ${employees.length}`);
    console.log(`  With Email: ${withEmail}`);
    console.log(`  Without Email: ${withoutEmail}`);
    console.log(`  With User Account: ${withUserAccount}`);
    console.log('');

    if (withoutEmail > 0) {
      console.log('⚠️  Some employees don\'t have email addresses.');
      console.log('   They won\'t be able to use forgot password feature.');
      console.log('   Add email addresses in the employee management page.');
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkEmployeeEmails();
