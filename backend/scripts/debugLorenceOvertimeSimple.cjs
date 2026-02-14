require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize, DataTypes, Op } = require('sequelize');

// Database connection
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

async function debug() {
  try {
    console.log('🔍 Checking Lorence overtime eligibility...\n');
    
    const today = '2026-02-14';
    const todayWeekday = 'Saturday';
    const lorenceId = 'TSI00003';
    
    console.log(`📅 Date: ${today} (${todayWeekday})`);
    console.log(`👤 Employee: ${lorenceId}\n`);
    
    // Check attendance
    console.log('1️⃣ ATTENDANCE CHECK:');
    const [attendance] = await sequelize.query(`
      SELECT employee_id, date, status, clock_in, clock_out, overtime_hours
      FROM "Attendances"
      WHERE employee_id = '${lorenceId}' AND date = '${today}'
    `);
    
    if (attendance.length === 0) {
      console.log('   ❌ No attendance record found\n');
      return;
    }
    
    const att = attendance[0];
    console.log(`   Status: ${att.status}`);
    console.log(`   Clock In: ${att.clock_in}`);
    console.log(`   Clock Out: ${att.clock_out}`);
    console.log(`   Eligible: ${['Present', 'Late'].includes(att.status) && att.clock_in ? '✅ YES' : '❌ NO'}\n`);
    
    // Check schedules
    console.log('2️⃣ SCHEDULE CHECK:');
    const [schedules] = await sequelize.query(`
      SELECT id, employee_id, days, schedule_dates, shift_name, start_date, end_date, status
      FROM employee_schedules
      WHERE employee_id = '${lorenceId}' AND status = 'Active'
    `);
    
    console.log(`   Found ${schedules.length} active schedule(s)\n`);
    
    if (schedules.length === 0) {
      console.log('   ❌ No active schedules found\n');
      return;
    }
    
    schedules.forEach((sched, i) => {
      console.log(`   Schedule ${i + 1}:`);
      console.log(`   - Days: ${JSON.stringify(sched.days)}`);
      console.log(`   - Schedule Dates: ${JSON.stringify(sched.schedule_dates)}`);
      console.log(`   - Shift: ${sched.shift_name}`);
      console.log(`   - Period: ${sched.start_date} to ${sched.end_date || 'ongoing'}`);
      
      // Check if scheduled for today
      const scheduleDatesStr = JSON.stringify(sched.schedule_dates || {});
      const daysStr = JSON.stringify(sched.days || []);
      
      const hasDate = scheduleDatesStr.includes(today);
      const hasWeekday = daysStr.includes(todayWeekday);
      
      console.log(`   - Has date ${today}: ${hasDate ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Has weekday ${todayWeekday}: ${hasWeekday ? '✅ YES' : '❌ NO'}`);
      console.log(`   - Scheduled today: ${hasDate || hasWeekday ? '✅ YES' : '❌ NO'}\n`);
    });
    
    // Check for existing overtime
    console.log('3️⃣ OVERTIME CHECK:');
    const [overtime] = await sequelize.query(`
      SELECT employee_id, date, status
      FROM "Attendances"
      WHERE employee_id = '${lorenceId}' AND date = '${today}' AND status = 'Overtime'
    `);
    
    console.log(`   Already has overtime: ${overtime.length > 0 ? '❌ YES' : '✅ NO'}\n`);
    
    // Final verdict
    const isEligible = 
      ['Present', 'Late'].includes(att.status) &&
      att.clock_in &&
      schedules.some(s => {
        const scheduleDatesStr = JSON.stringify(s.schedule_dates || {});
        const daysStr = JSON.stringify(s.days || []);
        return scheduleDatesStr.includes(today) || daysStr.includes(todayWeekday);
      }) &&
      overtime.length === 0;
    
    console.log('='.repeat(60));
    console.log(`RESULT: ${isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

debug();
