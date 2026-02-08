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

async function markAbsentFeb5() {
  try {
    console.log('🔄 Marking absent employees for Feb 5, 2026...\n');

    const targetDate = '2026-02-05';

    // Get all schedules for Feb 5
    const [schedules] = await sequelize.query(`
      SELECT es.*, st.shift_name, st.start_time, st.end_time
      FROM employee_schedules es
      JOIN schedule_templates st ON es.template_id = st.id
      WHERE es.schedule_dates LIKE ?
    `, { replacements: [`%${targetDate}%`] });

    console.log(`Found ${schedules.length} schedules for ${targetDate}`);

    for (const schedule of schedules) {
      const empId = schedule.employee_id;
      
      // Check if employee has attendance record for this date
      const [attendance] = await sequelize.query(`
        SELECT * FROM attendances
        WHERE employee_id = ? AND DATE(date) = ?
      `, { replacements: [empId, targetDate] });

      if (attendance.length > 0) {
        console.log(`  ✓ ${empId} has attendance record`);
        continue;
      }

      // Get employee details
      const [employees] = await sequelize.query(`
        SELECT * FROM employees WHERE employee_id = ?
      `, { replacements: [empId] });

      if (employees.length === 0) {
        console.log(`  ⚠️ Employee ${empId} not found`);
        continue;
      }

      const employee = employees[0];
      console.log(`  📝 Marking ${employee.firstname} ${employee.lastname} (${empId}) as Absent`);

      // Insert absent record
      await sequelize.query(`
        INSERT INTO attendances 
        (employee_id, date, status, clock_in, clock_out, total_hours, createdAt, updatedAt)
        VALUES (?, ?, 'Absent', NULL, NULL, 0, NOW(), NOW())
      `, { replacements: [employee.id, `${targetDate} ${schedule.start_time}`] });

      console.log(`    ✅ Absent record created`);
    }

    // Verify absent records
    console.log('\n\n📊 Verification - Absent records for Feb 5:');
    const [absentRecords] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname, e.employee_id
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE DATE(a.date) = ? AND a.status = 'Absent'
    `, { replacements: [targetDate] });

    console.log(`Total absent records: ${absentRecords.length}`);
    absentRecords.forEach(a => {
      console.log(`  - ${a.firstname} ${a.lastname} (${a.employee_id}): ${a.status} on ${a.date}`);
    });

    await sequelize.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

markAbsentFeb5();
