const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'rence652',
  database: 'secureattend_db',
  logging: false
});

async function checkFeb5Issue() {
  try {
    console.log('🔍 Investigating Feb 5 attendance issue...\n');

    // Check schedules for Feb 5
    console.log('📅 Checking schedules for Feb 5, 2026:');
    const [schedules] = await sequelize.query(`
      SELECT es.*, e.firstname, e.lastname, e.employee_id
      FROM employee_schedules es
      LEFT JOIN employees e ON es.employee_id = e.id
      WHERE es.schedule_dates LIKE '%2026-02-05%'
      ORDER BY es.employee_id
    `);
    
    console.log(`Found ${schedules.length} schedules for Feb 5:`);
    schedules.forEach(s => {
      console.log(`  - ${s.firstname} ${s.lastname} (${s.employee_id}): ${s.shift_name} (${s.start_time} - ${s.end_time})`);
    });

    // Check attendance records for Feb 5
    console.log('\n📊 Checking attendance records for Feb 5, 2026:');
    const [attendance] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname, e.employee_id
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE DATE(a.date) = '2026-02-05'
      ORDER BY a.employee_id, a.clock_in
    `);
    
    console.log(`Found ${attendance.length} attendance records for Feb 5:`);
    attendance.forEach(a => {
      console.log(`  - ${a.firstname} ${a.lastname} (${a.employee_id}): ${a.status} - Clock In: ${a.clock_in}, Clock Out: ${a.clock_out || 'N/A'}`);
    });

    // Check attendance records for Feb 4 (overnight shifts)
    console.log('\n🌙 Checking attendance records for Feb 4, 2026 (overnight shifts):');
    const [feb4Attendance] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname, e.employee_id
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE DATE(a.date) = '2026-02-04'
      ORDER BY a.employee_id, a.clock_in
    `);
    
    console.log(`Found ${feb4Attendance.length} attendance records for Feb 4:`);
    feb4Attendance.forEach(a => {
      console.log(`  - ${a.firstname} ${a.lastname} (${a.employee_id}): ${a.status} - Clock In: ${a.clock_in}, Clock Out: ${a.clock_out || 'N/A'}`);
    });

    // Check biometric local database
    console.log('\n💾 Checking biometric local database:');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '../BiometricEnrollmentApp/bin/Debug/net9.0-windows/biometric_local.db');
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.log('❌ Could not open biometric database:', err.message);
        return;
      }
      
      console.log('✅ Connected to biometric database');
      
      // Check schedules in biometric DB
      db.all(`SELECT * FROM EmployeeSchedules WHERE schedule_dates LIKE '%2026-02-05%'`, [], (err, rows) => {
        if (err) {
          console.log('❌ Error querying schedules:', err.message);
        } else {
          console.log(`\n📋 Biometric DB - Schedules for Feb 5: ${rows.length}`);
          rows.forEach(r => {
            console.log(`  - Employee ${r.employee_id}: ${r.shift_name} (${r.start_time} - ${r.end_time})`);
          });
        }
        
        // Check attendance sessions in biometric DB
        db.all(`SELECT * FROM AttendanceSessions WHERE date = '2026-02-05'`, [], (err, rows) => {
          if (err) {
            console.log('❌ Error querying attendance sessions:', err.message);
          } else {
            console.log(`\n📊 Biometric DB - Attendance sessions for Feb 5: ${rows.length}`);
            rows.forEach(r => {
              console.log(`  - Employee ${r.employee_id}: ${r.status} - Clock In: ${r.clock_in}, Clock Out: ${r.clock_out || 'N/A'}`);
            });
          }
          
          // Check Feb 4 sessions (overnight)
          db.all(`SELECT * FROM AttendanceSessions WHERE date = '2026-02-04'`, [], (err, rows) => {
            if (err) {
              console.log('❌ Error querying Feb 4 sessions:', err.message);
            } else {
              console.log(`\n🌙 Biometric DB - Attendance sessions for Feb 4: ${rows.length}`);
              rows.forEach(r => {
                console.log(`  - Employee ${r.employee_id}: ${r.status} - Clock In: ${r.clock_in}, Clock Out: ${r.clock_out || 'N/A'}`);
              });
            }
            
            db.close();
            sequelize.close();
          });
        });
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

checkFeb5Issue();
