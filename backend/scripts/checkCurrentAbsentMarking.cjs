const { Sequelize } = require('sequelize');
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

async function checkAbsentMarking() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Manila' });
    
    console.log(`📅 Current Date: ${today}`);
    console.log(`📅 Day of Week: ${dayOfWeek}`);
    console.log(`🕐 Current Time (Manila): ${now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}\n`);

    // Check schedules for today
    const [schedules] = await sequelize.query(`
      SELECT 
        es.id,
        es.employee_id,
        e.firstname || ' ' || e.lastname as employee_name,
        st.shift_name,
        st.start_time,
        st.end_time,
        es.days,
        es.schedule_dates
      FROM employee_schedules es
      LEFT JOIN "Employees" e ON e.employee_id = es.employee_id
      LEFT JOIN schedule_templates st ON st.id = es.template_id
      WHERE es.status = 'Active'
        AND (
          es.days::text LIKE '%${dayOfWeek}%'
          OR es.schedule_dates::text LIKE '%${today}%'
        )
      ORDER BY es.employee_id
    `);

    console.log(`📊 Schedules for ${dayOfWeek} (${today}): ${schedules.length} found\n`);
    
    if (schedules.length > 0) {
      console.log('📋 Schedule Details:');
      schedules.forEach(s => {
        const scheduleType = s.schedule_dates && JSON.stringify(s.schedule_dates).includes(today) 
          ? `specific (${today})` 
          : `recurring (${JSON.stringify(s.days)})`;
        console.log(`  - ${s.employee_id} (${s.employee_name}): ${s.shift_name} (${s.start_time} - ${s.end_time}) [${scheduleType}]`);
      });
      console.log('');
    }

    // Check attendance records for today
    const [attendance] = await sequelize.query(`
      SELECT 
        a.id,
        a.employee_id,
        e.firstname || ' ' || e.lastname as employee_name,
        a.date,
        a.clock_in,
        a.clock_out,
        a.status,
        a."createdAt"
      FROM "Attendances" a
      LEFT JOIN "Employees" e ON e.employee_id = a.employee_id
      WHERE a.date = '${today}'
      ORDER BY a.employee_id, a."createdAt" DESC
    `);

    console.log(`📊 Attendance Records for ${today}: ${attendance.length} found\n`);
    
    if (attendance.length > 0) {
      console.log('📋 Attendance Details:');
      attendance.forEach(a => {
        console.log(`  - ${a.employee_id} (${a.employee_name}): ${a.status}`);
        console.log(`    Clock In: ${a.clock_in || 'NULL'}`);
        console.log(`    Clock Out: ${a.clock_out || 'NULL'}`);
        console.log(`    Created: ${new Date(a.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
      });
      console.log('');
    }

    // Check for scheduled employees without attendance
    console.log('🔍 Analysis: Scheduled employees without attendance records\n');
    
    const scheduledEmployeeIds = schedules.map(s => s.employee_id);
    const attendanceEmployeeIds = attendance.map(a => a.employee_id);
    
    const missingAttendance = schedules.filter(s => !attendanceEmployeeIds.includes(s.employee_id));
    
    if (missingAttendance.length > 0) {
      console.log(`⚠️ ${missingAttendance.length} scheduled employees have NO attendance record:`);
      missingAttendance.forEach(s => {
        console.log(`  - ${s.employee_id} (${s.employee_name}): ${s.shift_name} (${s.start_time} - ${s.end_time})`);
        
        // Check if shift has ended
        const endTimeParts = s.end_time.split(':');
        const endHour = parseInt(endTimeParts[0]);
        const endMinute = parseInt(endTimeParts[1]);
        const shiftEndTime = new Date(now);
        shiftEndTime.setHours(endHour, endMinute, 0, 0);
        
        const gracePeriod = 30; // minutes
        const shiftEndWithGrace = new Date(shiftEndTime.getTime() + gracePeriod * 60000);
        
        if (now >= shiftEndWithGrace) {
          console.log(`    ❌ Shift ended at ${s.end_time} + ${gracePeriod} min grace = SHOULD BE MARKED ABSENT`);
        } else {
          console.log(`    ⏳ Shift ends at ${s.end_time} + ${gracePeriod} min grace = Still within grace period`);
        }
      });
      console.log('');
    } else {
      console.log('✅ All scheduled employees have attendance records\n');
    }

    // Check for employees with clock-in but no clock-out
    const missedClockOut = attendance.filter(a => a.clock_in && !a.clock_out && a.status !== 'Missed Clock-out');
    
    if (missedClockOut.length > 0) {
      console.log(`⚠️ ${missedClockOut.length} employees clocked in but haven't clocked out:`);
      missedClockOut.forEach(a => {
        const schedule = schedules.find(s => s.employee_id === a.employee_id);
        if (schedule) {
          console.log(`  - ${a.employee_id} (${a.employee_name}): Clocked in at ${a.clock_in}, Status: ${a.status}`);
          console.log(`    Shift: ${schedule.start_time} - ${schedule.end_time}`);
          
          // Check if shift has ended
          const endTimeParts = schedule.end_time.split(':');
          const endHour = parseInt(endTimeParts[0]);
          const endMinute = parseInt(endTimeParts[1]);
          const shiftEndTime = new Date(now);
          shiftEndTime.setHours(endHour, endMinute, 0, 0);
          
          const gracePeriod = 30; // minutes
          const shiftEndWithGrace = new Date(shiftEndTime.getTime() + gracePeriod * 60000);
          
          if (now >= shiftEndWithGrace) {
            console.log(`    🕐 Shift ended at ${schedule.end_time} + ${gracePeriod} min grace = SHOULD BE MARKED MISSED CLOCK-OUT`);
          } else {
            console.log(`    ⏳ Shift ends at ${schedule.end_time} + ${gracePeriod} min grace = Still within grace period`);
          }
        }
      });
      console.log('');
    }

    console.log('✅ Diagnostic complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkAbsentMarking();
