import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";

// Force MySQL connection for local database
const sequelize = new Sequelize('secureattend_db', 'root', 'rence652', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

const exportAllData = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to local MySQL database\n");

    // Export Users
    const [users] = await sequelize.query("SELECT * FROM Users ORDER BY id");
    console.log(`📋 Found ${users.length} users`);

    // Export Employees
    const [employees] = await sequelize.query("SELECT * FROM Employees ORDER BY id");
    console.log(`👥 Found ${employees.length} employees`);

    // Export Positions
    const [positions] = await sequelize.query("SELECT * FROM Positions ORDER BY id");
    console.log(`💼 Found ${positions.length} positions`);

    // Export Departments
    const [departments] = await sequelize.query("SELECT * FROM Departments ORDER BY id");
    console.log(`🏢 Found ${departments.length} departments`);

    // Export Attendances (last 30 days)
    const [attendances] = await sequelize.query(`
      SELECT * FROM Attendances 
      WHERE clock_in >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY clock_in DESC
    `);
    console.log(`📊 Found ${attendances.length} attendance records (last 30 days)`);

    // Export Employee Schedules
    const [schedules] = await sequelize.query("SELECT * FROM EmployeeSchedules ORDER BY id");
    console.log(`📅 Found ${schedules.length} employee schedules`);

    // Export Schedule Templates
    const [templates] = await sequelize.query("SELECT * FROM ScheduleTemplates ORDER BY id");
    console.log(`📝 Found ${templates.length} schedule templates`);

    // Prepare export data
    const exportData = {
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password, // Already hashed
        role: u.role,
        employeeId: u.employeeId,
        firstname: u.firstname,
        lastname: u.lastname,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      })),
      employees: employees.map(e => ({
        id: e.id,
        employee_id: e.employee_id,
        firstname: e.firstname,
        lastname: e.lastname,
        department: e.department,
        position: e.position,
        contact_number: e.contact_number,
        email: e.email,
        photo: e.photo,
        date_hired: e.date_hired,
        status: e.status,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      })),
      positions: positions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })),
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        manager: d.manager,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      })),
      attendances: attendances.map(a => ({
        id: a.id,
        employee_id: a.employee_id,
        clock_in: a.clock_in,
        clock_out: a.clock_out,
        status: a.status,
        overtime_hours: a.overtime_hours,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      })),
      schedules: schedules.map(s => ({
        id: s.id,
        employee_id: s.employee_id,
        template_id: s.template_id,
        shift_name: s.shift_name,
        start_time: s.start_time,
        end_time: s.end_time,
        days: s.days,
        specific_date: s.specific_date,
        assigned_by: s.assigned_by,
        assigned_date: s.assigned_date,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      })),
      templates: templates.map(t => ({
        id: t.id,
        shift_name: t.shift_name,
        start_time: t.start_time,
        end_time: t.end_time,
        days: t.days,
        specific_date: t.specific_date,
        assigned_employees: t.assigned_employees,
        created_by: t.created_by,
        edited: t.edited,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }))
    };

    // Save to file
    const exportPath = path.join(process.cwd(), 'backend', 'scripts', 'render_import_data.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log("\n✅ Data exported successfully!");
    console.log(`📁 File saved to: ${exportPath}`);
    console.log("\n📊 Export Summary:");
    console.log(`   Users: ${exportData.users.length}`);
    console.log(`   Employees: ${exportData.employees.length}`);
    console.log(`   Positions: ${exportData.positions.length}`);
    console.log(`   Departments: ${exportData.departments.length}`);
    console.log(`   Attendances: ${exportData.attendances.length}`);
    console.log(`   Schedules: ${exportData.schedules.length}`);
    console.log(`   Templates: ${exportData.templates.length}`);

    // Display user accounts
    console.log("\n👤 USER ACCOUNTS:");
    console.log("=".repeat(60));
    exportData.users.forEach(u => {
      console.log(`${u.username.padEnd(20)} | ${u.role.padEnd(15)} | Employee ID: ${u.employeeId || 'N/A'}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
};

exportAllData();
