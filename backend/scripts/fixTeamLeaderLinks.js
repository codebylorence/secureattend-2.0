import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Use Render PostgreSQL URL
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

async function fixTeamLeaderLinks() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to Render PostgreSQL\n");

    // Find all team leader users and their employee records
    console.log("🔍 Finding team leaders and their employees...\n");
    
    // First, let's see what we have
    const [users] = await sequelize.query(`
      SELECT id, username, role, "employeeId", firstname, lastname
      FROM "Users"
      WHERE role = 'teamleader'
    `);
    
    console.log("Team Leader Users:");
    users.forEach(u => {
      console.log(`  ${u.username} (ID: ${u.id}, employeeId FK: ${u.employeeId})`);
    });
    console.log();
    
    const [employees] = await sequelize.query(`
      SELECT id, employee_id, firstname, lastname, department, position
      FROM "Employees"
      WHERE position = 'Team Leader'
    `);
    
    console.log("Team Leader Employees:");
    employees.forEach(e => {
      console.log(`  ${e.firstname} ${e.lastname} (ID: ${e.id}, employee_id: ${e.employee_id}, dept: ${e.department})`);
    });
    console.log();
    
    // Manual mapping based on names
    const mappings = [
      { username: 'Fernando', firstname: 'Fernando', lastname: 'Dela Cruz' },
      { username: 'Kenny', firstname: 'Kenny', lastname: 'Siatita' },
      { username: 'Jerico', firstname: 'Jerico', lastname: 'Llaneta' },
      { username: 'Novaleen', firstname: 'Novaleen', lastname: 'Bonque' }
    ];
    
    console.log("🔧 Fixing team leader links...\n");
    
    for (const mapping of mappings) {
      const user = users.find(u => u.username === mapping.username);
      const employee = employees.find(e => 
        e.firstname === mapping.firstname && e.lastname === mapping.lastname
      );
      
      if (user && employee) {
        console.log(`Linking ${user.username} to ${employee.firstname} ${employee.lastname}`);
        console.log(`  User ID: ${user.id}, Current employeeId FK: ${user.employeeId}`);
        console.log(`  Employee ID: ${employee.id}, employee_id: ${employee.employee_id}, dept: ${employee.department}`);
        
        if (user.employeeId !== employee.id) {
          await sequelize.query(`
            UPDATE "Users"
            SET "employeeId" = $1
            WHERE id = $2
          `, {
            bind: [employee.id, user.id]
          });
          
          console.log(`  ✅ Fixed! Updated employeeId from ${user.employeeId} to ${employee.id}`);
        } else {
          console.log(`  ✅ Already correct`);
        }
      } else {
        console.log(`⚠️ Could not find match for ${mapping.username}`);
        if (!user) console.log(`   User not found`);
        if (!employee) console.log(`   Employee not found`);
      }
      console.log();
    }

    // Verify the fix
    console.log("\n🔍 Verifying fix...\n");
    const [verification] = await sequelize.query(`
      SELECT 
        u.username,
        u.role,
        u."employeeId",
        e.id as employee_id,
        e.employee_id as employee_string_id,
        e.department,
        e.position
      FROM "Users" u
      JOIN "Employees" e ON e.id = u."employeeId"
      WHERE u.role = 'teamleader'
    `);

    console.log("✅ Verification results:");
    verification.forEach(v => {
      console.log(`  ${v.username}: employeeId=${v.employeeId}, employee=${v.employee_string_id}, dept=${v.department}`);
    });

    console.log("\n✅ Team leader links fixed successfully!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

fixTeamLeaderLinks();
