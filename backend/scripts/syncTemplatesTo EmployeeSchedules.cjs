const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function syncTemplates() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get all active templates with assigned employees
    const [templates] = await sequelize.query(`
      SELECT 
        id,
        shift_name,
        start_time,
        end_time,
        days,
        specific_date,
        assigned_employees,
        status
      FROM schedule_templates
      WHERE status = 'Active'
        AND assigned_employees IS NOT NULL
        AND assigned_employees::text != '[]'
      ORDER BY id
    `);

    console.log(`📊 Found ${templates.length} active templates with assigned employees\n`);

    if (templates.length === 0) {
      console.log('⚠️ No templates to sync');
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const template of templates) {
      try {
        const assignedEmployees = JSON.parse(template.assigned_employees);
        // days is stored as a string like "Monday", not JSON array
        const days = template.days ? [template.days] : [];
        
        console.log(`\n📋 Processing template ${template.id}: ${template.shift_name}`);
        console.log(`   Days: ${JSON.stringify(days)}`);
        console.log(`   Specific Date: ${template.specific_date || 'N/A'}`);
        console.log(`   Assigned Employees: ${assignedEmployees.length}`);

        for (const assignment of assignedEmployees) {
          const employeeId = assignment.employee_id;
          
          // Check if schedule already exists
          const [existing] = await sequelize.query(`
            SELECT id FROM employee_schedules
            WHERE employee_id = :employeeId
              AND template_id = :templateId
              AND status = 'Active'
          `, {
            replacements: { employeeId, templateId: template.id }
          });

          if (existing.length > 0) {
            console.log(`   ⏭️  ${employeeId} - Already has schedule`);
            skipped++;
            continue;
          }

          // Create schedule_dates object if specific_date exists
          let scheduleDates = null;
          if (template.specific_date && days.length > 0) {
            scheduleDates = {};
            days.forEach(day => {
              scheduleDates[day] = [template.specific_date];
            });
          }

          // Create employee_schedule record
          await sequelize.query(`
            INSERT INTO employee_schedules (
              employee_id,
              template_id,
              days,
              schedule_dates,
              start_date,
              end_date,
              assigned_by,
              status,
              "createdAt",
              "updatedAt"
            ) VALUES (
              :employeeId,
              :templateId,
              :days,
              :scheduleDates,
              :startDate,
              NULL,
              :assignedBy,
              'Active',
              NOW(),
              NOW()
            )
          `, {
            replacements: {
              employeeId,
              templateId: template.id,
              days: JSON.stringify(days),
              scheduleDates: scheduleDates ? JSON.stringify(scheduleDates) : null,
              startDate: template.specific_date || new Date().toISOString().split('T')[0],
              assignedBy: assignment.assigned_by || 'admin'
            }
          });

          console.log(`   ✅ ${employeeId} - Schedule created`);
          created++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing template ${template.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n\n📊 Sync Complete:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);

    // Verify the sync
    const [count] = await sequelize.query(`
      SELECT COUNT(*) as count FROM employee_schedules WHERE status = 'Active'
    `);
    console.log(`\n📊 Total active employee_schedules: ${count[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

syncTemplates();
