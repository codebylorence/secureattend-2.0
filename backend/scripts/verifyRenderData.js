import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

const verifyData = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to Render PostgreSQL\n");

    // Check Positions
    const [positions] = await sequelize.query('SELECT COUNT(*) as count FROM "Positions"');
    console.log(`📋 Positions: ${positions[0].count}`);

    // Check Departments
    const [departments] = await sequelize.query('SELECT COUNT(*) as count FROM "Departments"');
    console.log(`🏢 Departments: ${departments[0].count}`);

    // Check Employees
    const [employees] = await sequelize.query('SELECT id, employee_id, firstname, lastname, position FROM "Employees" ORDER BY id');
    console.log(`\n👥 Employees: ${employees.length}`);
    employees.forEach(emp => {
      console.log(`   ID: ${emp.id} | ${emp.employee_id} | ${emp.firstname} ${emp.lastname} | ${emp.position}`);
    });

    // Check Users
    const [users] = await sequelize.query('SELECT id, username, role, "employeeId" FROM "Users" ORDER BY id');
    console.log(`\n👤 Users: ${users.length}`);
    users.forEach(user => {
      console.log(`   ID: ${user.id} | ${user.username.padEnd(20)} | ${user.role.padEnd(15)} | Employee FK: ${user.employeeId || 'NULL'}`);
    });

    // Check Attendances
    const [attendances] = await sequelize.query('SELECT COUNT(*) as count FROM "Attendances"');
    console.log(`\n📊 Attendances: ${attendances[0].count}`);

    // Test admin login credentials
    console.log("\n🔐 Testing Admin Accounts:");
    const [admins] = await sequelize.query('SELECT username, role FROM "Users" WHERE role = \'admin\'');
    admins.forEach(admin => {
      console.log(`   ✓ ${admin.username} (${admin.role})`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
  }
};

verifyData();
