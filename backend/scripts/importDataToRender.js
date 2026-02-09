import { Sequelize, DataTypes } from "sequelize";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Connect to PostgreSQL on Render
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

const importData = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to Render PostgreSQL database\n");

    // Read export file
    const exportPath = path.join(process.cwd(), 'scripts', 'render_import_data.json');
    if (!fs.existsSync(exportPath)) {
      console.error("❌ Export file not found!");
      console.error("   Please run: node backend/scripts/exportAllDataForRender.js first");
      return;
    }

    const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    console.log("📁 Loaded export data:");
    console.log(`   Users: ${data.users.length}`);
    console.log(`   Employees: ${data.employees.length}`);
    console.log(`   Positions: ${data.positions.length}`);
    console.log(`   Departments: ${data.departments.length}`);
    console.log(`   Attendances: ${data.attendances.length}`);
    console.log(`   Schedules: ${data.schedules.length}`);
    console.log(`   Templates: ${data.templates.length}\n`);

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 1. Import Positions (no dependencies)
      console.log("📋 Importing positions...");
      for (const pos of data.positions) {
        await sequelize.query(
          `INSERT INTO "Positions" (id, name, description, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           "updatedAt" = EXCLUDED."updatedAt"`,
          {
            bind: [pos.id, pos.name, pos.description, pos.createdAt, pos.updatedAt],
            transaction
          }
        );
      }
      console.log(`✅ Imported ${data.positions.length} positions`);

      // 2. Import Departments (no dependencies)
      console.log("🏢 Importing departments...");
      for (const dept of data.departments) {
        await sequelize.query(
          `INSERT INTO "Departments" (id, name, description, manager, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           manager = EXCLUDED.manager,
           "updatedAt" = EXCLUDED."updatedAt"`,
          {
            bind: [dept.id, dept.name, dept.description, dept.manager, dept.createdAt, dept.updatedAt],
            transaction
          }
        );
      }
      console.log(`✅ Imported ${data.departments.length} departments`);

      // 3. Import Employees (depends on Positions, Departments)
      console.log("👥 Importing employees...");
      for (const emp of data.employees) {
        await sequelize.query(
          `INSERT INTO "Employees" (id, employee_id, firstname, lastname, department, position, contact_number, email, photo, date_hired, status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
           employee_id = EXCLUDED.employee_id,
           firstname = EXCLUDED.firstname,
           lastname = EXCLUDED.lastname,
           department = EXCLUDED.department,
           position = EXCLUDED.position,
           contact_number = EXCLUDED.contact_number,
           email = EXCLUDED.email,
           photo = EXCLUDED.photo,
           date_hired = EXCLUDED.date_hired,
           status = EXCLUDED.status,
           "updatedAt" = EXCLUDED."updatedAt"`,
          {
            bind: [
              emp.id, emp.employee_id, emp.firstname, emp.lastname, emp.department,
              emp.position, emp.contact_number, emp.email, emp.photo, emp.date_hired,
              emp.status, emp.createdAt, emp.updatedAt
            ],
            transaction
          }
        );
      }
      console.log(`✅ Imported ${data.employees.length} employees`);

      // 4. Import Users (depends on Employees)
      console.log("👤 Importing users...");
      for (const user of data.users) {
        await sequelize.query(
          `INSERT INTO "Users" (id, username, password, role, "employeeId", firstname, lastname, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password = EXCLUDED.password,
           role = EXCLUDED.role,
           "employeeId" = EXCLUDED."employeeId",
           firstname = EXCLUDED.firstname,
           lastname = EXCLUDED.lastname,
           "updatedAt" = EXCLUDED."updatedAt"`,
          {
            bind: [
              user.id, user.username, user.password, user.role, user.employeeId,
              user.firstname, user.lastname, user.createdAt, user.updatedAt
            ],
            transaction
          }
        );
      }
      console.log(`✅ Imported ${data.users.length} users`);

      // 5. Import Schedule Templates
      console.log("📝 Importing schedule templates...");
      for (const template of data.templates) {
        await sequelize.query(
          `INSERT INTO "ScheduleTemplates" (id, shift_name, start_time, end_time, days, specific_date, assigned_employees, created_by, edited, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
           shift_name = EXCLUDED.shift_name,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           days = EXCLUDED.days,
           specific_date = EXCLUDED.specific_date,
           assigned_employees = EXCLUDED.assigned_employees,
           created_by = EXCLUDED.created_by,
           edited = EXCLUDED.edited,
           "updatedAt" = EXCLUDED."updatedAt"`,
          {
            bind: [
              template.id, template.shift_name, template.start_time, template.end_time,
              template.days, template.specific_date, template.assigned_employees,
              template.created_by, template.edited, template.createdAt, template.updatedAt
            ],
            transaction
          }
        );
      }
      console.log(`✅ Imported ${data.templates.length} schedule templates`);

      // 6. Import Employee Schedules
      console.log("📅 Importing employee schedules...");
      for (const schedule of data.schedules) {
        await sequelize.query(
          `INSERT INTO "EmployeeSchedules" (id, employee_id, template_id, shift_name, start_time, end_time, days, specific_date, assigned_by, assigned_date, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO UPDATE SET
           employee_id = EXCLUDED.employee_id,
           template_id = EXCLUDED.template_id,
           shift_name = EXCLUDED.shift_name,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           days = EXCLUDED.days,
           specific_date = EXCLUDED.specific_date,
           assigned_by = EXCLUDED.assigned_by,
           assigned_date = EXCLUDED.assigned_date,
           "updatedAt" = EXCLUDED."updatedAt"`,
          {
            bind: [
              schedule.id, schedule.employee_id, schedule.template_id, schedule.shift_name,
              schedule.start_time, schedule.end_time, schedule.days, schedule.specific_date,
              schedule.assigned_by, schedule.assigned_date, schedule.createdAt, schedule.updatedAt
            ],
            transaction
          }
        );
      }
      console.log(`✅ Imported ${data.schedules.length} employee schedules`);

      // 7. Import Attendances
      console.log("📊 Importing attendances...");
      for (const att of data.attendances) {
        await sequelize.query(
          `INSERT INTO "Attendances" (id, employee_id, clock_in, clock_out, status, overtime_hours, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
           employee_id = EXCLUDED.employee_id,
           clock_in = EXCLUDED.clock_in,
           clock_out = EXCLUDED.clock_out,
           status = EXCLUDED.status,
           overtime_hours = EXCLUDED.overtime_hours,
           "updatedAt" = EXCLUDED."updatedAt"`,
          {
            bind: [
              att.id, att.employee_id, att.clock_in, att.clock_out,
              att.status, att.overtime_hours, att.createdAt, att.updatedAt
            ],
            transaction
          }
        );
      }
      console.log(`✅ Imported ${data.attendances.length} attendances`);

      // Commit transaction
      await transaction.commit();
      console.log("\n✅ All data imported successfully!");

      // Display summary
      console.log("\n📊 IMPORT SUMMARY:");
      console.log("=".repeat(60));
      console.log(`✅ Positions: ${data.positions.length}`);
      console.log(`✅ Departments: ${data.departments.length}`);
      console.log(`✅ Employees: ${data.employees.length}`);
      console.log(`✅ Users: ${data.users.length}`);
      console.log(`✅ Schedule Templates: ${data.templates.length}`);
      console.log(`✅ Employee Schedules: ${data.schedules.length}`);
      console.log(`✅ Attendances: ${data.attendances.length}`);

      console.log("\n👤 USER ACCOUNTS IMPORTED:");
      console.log("=".repeat(60));
      data.users.forEach(u => {
        console.log(`${u.username.padEnd(20)} | ${u.role.padEnd(15)} | Employee ID: ${u.employeeId || 'N/A'}`);
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
};

importData();
