const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'rence652',
  database: 'secureattend_db',
  logging: false
});

async function generateSchedules() {
  try {
    console.log('🔄 Generating employee schedules from templates...\n');

    // Get templates for Feb 5
    const [templates] = await sequelize.query(`
      SELECT * FROM schedule_templates
      WHERE specific_date = '2026-02-05'
      ORDER BY id
    `);
    
    console.log(`Found ${templates.length} templates for Feb 5`);

    for (const template of templates) {
      console.log(`\nProcessing Template ${template.id}: ${template.shift_name}`);
      
      // Parse assigned employees
      let assignedEmployees = [];
      try {
        assignedEmployees = JSON.parse(template.assigned_employees || '[]');
      } catch (e) {
        console.log(`  ⚠️ Could not parse assigned_employees`);
        continue;
      }

      console.log(`  Assigned employees: ${assignedEmployees.length}`);

      for (const assignment of assignedEmployees) {
        const empId = assignment.employee_id;
        
        // Get employee details
        const [employees] = await sequelize.query(`
          SELECT * FROM employees WHERE employee_id = ?
        `, { replacements: [empId] });

        if (employees.length === 0) {
          console.log(`  ⚠️ Employee ${empId} not found`);
          continue;
        }

        const employee = employees[0];
        console.log(`  Creating schedule for ${employee.firstname} ${employee.lastname} (${empId})`);

        // Check if schedule already exists
        const [existing] = await sequelize.query(`
          SELECT * FROM employee_schedules
          WHERE employee_id = ? AND template_id = ? AND schedule_dates LIKE '%2026-02-05%'
        `, { replacements: [empId, template.id] });

        if (existing.length > 0) {
          console.log(`    ✓ Schedule already exists (ID: ${existing[0].id})`);
          continue;
        }

        // Insert employee schedule
        await sequelize.query(`
          INSERT INTO employee_schedules 
          (employee_id, template_id, days, schedule_dates, assigned_by, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, 'Active', NOW(), NOW())
        `, {
          replacements: [
            empId,  // Use employee_id string, not numeric id
            template.id,
            JSON.stringify([template.days]),
            JSON.stringify(['2026-02-05']),
            assignment.assigned_by || 'admin'
          ]
        });

        console.log(`    ✅ Schedule created`);
      }
    }

    // Verify created schedules
    console.log('\n\n📊 Verification - Schedules for Feb 5:');
    const [schedules] = await sequelize.query(`
      SELECT es.*, e.firstname, e.lastname, e.employee_id
      FROM employee_schedules es
      LEFT JOIN employees e ON es.employee_id = e.id
      WHERE es.schedule_dates LIKE '%2026-02-05%'
      ORDER BY es.employee_id
    `);

    console.log(`Total schedules created: ${schedules.length}`);
    schedules.forEach(s => {
      console.log(`  - ${s.firstname} ${s.lastname} (${s.employee_id}): ${s.shift_name} (${s.start_time} - ${s.end_time})`);
    });

    await sequelize.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

generateSchedules();
