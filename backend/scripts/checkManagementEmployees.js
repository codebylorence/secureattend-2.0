import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://secureattend_db_5i34_user:I5yY6w5AP1uxpS6T6Vj60kqbzCoF15Ue@dpg-d64o6nv5r7bs739d7jo0-a.singapore-postgres.render.com/secureattend_db_5i34";

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function checkManagementEmployees() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to Render PostgreSQL\n");

    // Check all employees with management positions
    console.log("🔍 Checking employees with management positions:\n");
    
    const [employees] = await sequelize.query(`
      SELECT 
        e.id,
        e.employee_id,
        e.firstname,
        e.lastname,
        e.department,
        e.position,
        e.status,
        e.has_fingerprint,
        u.id as user_id,
        u.username,
        u.role as user_role
      FROM "Employees" e
      LEFT JOIN "Users" u ON u."employeeId" = e.id
      WHERE e.position IN ('Supervisor', 'Warehouse Admin', 'Warehouse Manager')
      ORDER BY e.position, e.employee_id
    `);

    console.log(`Found ${employees.length} management employee(s):\n`);
    
    employees.forEach(emp => {
      console.log(`Employee: ${emp.firstname} ${emp.lastname}`);
      console.log(`  ID (auto-increment): ${emp.id}`);
      console.log(`  Employee ID (string): ${emp.employee_id}`);
      console.log(`  Position: ${emp.position}`);
      console.log(`  Department: ${emp.department}`);
      console.log(`  Status: ${emp.status}`);
      console.log(`  Has Fingerprint: ${emp.has_fingerprint}`);
      console.log(`  User Account: ${emp.user_id ? `Yes (username: ${emp.username}, role: ${emp.user_role})` : 'No'}`);
      console.log();
    });

    // Check TSI12345 specifically
    console.log("\n🔍 Checking TSI12345 specifically:\n");
    const [tsi12345] = await sequelize.query(`
      SELECT 
        e.*,
        u.id as user_id,
        u.username,
        u.role as user_role
      FROM "Employees" e
      LEFT JOIN "Users" u ON u."employeeId" = e.id
      WHERE e.employee_id = 'TSI12345'
    `);

    if (tsi12345.length > 0) {
      const emp = tsi12345[0];
      console.log(`✅ Found TSI12345:`);
      console.log(`  Name: ${emp.firstname} ${emp.lastname}`);
      console.log(`  Position: ${emp.position}`);
      console.log(`  Department: ${emp.department}`);
      console.log(`  Status: ${emp.status}`);
      console.log(`  Has Fingerprint: ${emp.has_fingerprint}`);
      console.log(`  User Account: ${emp.user_id ? `Yes (ID: ${emp.user_id}, username: ${emp.username}, role: ${emp.user_role})` : 'No'}`);
    } else {
      console.log(`❌ TSI12345 not found in database`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

checkManagementEmployees();
