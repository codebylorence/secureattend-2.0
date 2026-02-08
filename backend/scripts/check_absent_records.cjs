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

async function checkAbsentRecords() {
  try {
    console.log('🔍 Checking absent records for Feb 5, 2026...\n');

    // Check all attendance records for Feb 5
    const [feb5Records] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname, e.employee_id
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE DATE(a.date) = '2026-02-05'
      ORDER BY a.employee_id, a.clock_in
    `);
    
    console.log(`📊 Attendance records for Feb 5: ${feb5Records.length}`);
    if (feb5Records.length > 0) {
      feb5Records.forEach(a => {
        console.log(`  - ${a.firstname} ${a.lastname} (${a.employee_id}): ${a.status}`);
      });
    } else {
      console.log('  No records found');
    }

    // Check all attendance records for Feb 4
    console.log('\n📊 Attendance records for Feb 4: ');
    const [feb4Records] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname, e.employee_id
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE DATE(a.date) = '2026-02-04'
      ORDER BY a.employee_id, a.clock_in
    `);
    
    console.log(`Found ${feb4Records.length} records`);
    if (feb4Records.length > 0) {
      feb4Records.forEach(a => {
        console.log(`  - ${a.firstname || 'NULL'} ${a.lastname || 'NULL'} (${a.employee_id || 'NULL'}): ${a.status}`);
      });
    }

    // Check all attendance records for Feb 6
    console.log('\n📊 Attendance records for Feb 6: ');
    const [feb6Records] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname, e.employee_id
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE DATE(a.date) = '2026-02-06'
      ORDER BY a.employee_id, a.clock_in
    `);
    
    console.log(`Found ${feb6Records.length} records`);
    if (feb6Records.length > 0) {
      feb6Records.forEach(a => {
        console.log(`  - ${a.firstname} ${a.lastname} (${a.employee_id}): ${a.status}`);
      });
    }

    // Check schedules for Feb 5
    console.log('\n\n📅 Schedules for Feb 5, 2026:');
    const [schedules] = await sequelize.query(`
      SELECT es.*, e.firstname, e.lastname, e.employee_id
      FROM employee_schedules es
      LEFT JOIN employees e ON es.employee_id = e.id
      WHERE es.schedule_dates LIKE '%2026-02-05%'
      ORDER BY es.employee_id
    `);
    
    console.log(`Found ${schedules.length} schedules`);
    if (schedules.length > 0) {
      schedules.forEach(s => {
        console.log(`  - ${s.firstname} ${s.lastname} (${s.employee_id}): ${s.shift_name} (${s.start_time} - ${s.end_time})`);
      });
    }

    // Check the specific employees from the screenshot
    console.log('\n\n👥 Checking specific employees from screenshot:');
    const employeeIds = ['TSI00002', 'TSI00001', 'TSI00005', 'TSI00009', 'TSI00004', 'TSI00003', 'TSI00006'];
    
    for (const empId of employeeIds) {
      const [employee] = await sequelize.query(`
        SELECT * FROM employees WHERE employee_id = ?
      `, { replacements: [empId] });
      
      if (employee.length > 0) {
        const emp = employee[0];
        console.log(`\n${emp.firstname} ${emp.lastname} (${emp.employee_id}):`);
        
        // Check their schedules
        const [empSchedules] = await sequelize.query(`
          SELECT * FROM employee_schedules 
          WHERE employee_id = ? AND schedule_dates LIKE '%2026-02-05%'
        `, { replacements: [emp.id] });
        
        console.log(`  Schedules for Feb 5: ${empSchedules.length}`);
        
        // Check their attendance
        const [empAttendance] = await sequelize.query(`
          SELECT * FROM attendances 
          WHERE employee_id = ? AND DATE(date) = '2026-02-05'
        `, { replacements: [emp.id] });
        
        console.log(`  Attendance records for Feb 5: ${empAttendance.length}`);
        if (empAttendance.length > 0) {
          empAttendance.forEach(a => {
            console.log(`    - ${a.status} at ${a.date}`);
          });
        }
      }
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

checkAbsentRecords();
