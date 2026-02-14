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

async function checkAllSchedules() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check all schedules
    const [schedules] = await sequelize.query(`
      SELECT 
        es.id,
        es.employee_id,
        e.firstname || ' ' || e.lastname as employee_name,
        st.shift_name,
        st.start_time,
        st.end_time,
        es.days,
        es.schedule_dates,
        es.status,
        es.start_date,
        es.end_date
      FROM employee_schedules es
      LEFT JOIN "Employees" e ON e.employee_id = es.employee_id
      LEFT JOIN schedule_templates st ON st.id = es.template_id
      ORDER BY es.employee_id
    `);

    console.log(`📊 Total schedules in database: ${schedules.length}\n`);
    
    if (schedules.length > 0) {
      console.log('📋 All Schedules:');
      schedules.forEach(s => {
        console.log(`\n  Employee: ${s.employee_id} (${s.employee_name})`);
        console.log(`  Shift: ${s.shift_name} (${s.start_time} - ${s.end_time})`);
        console.log(`  Days: ${JSON.stringify(s.days)}`);
        console.log(`  Schedule Dates: ${JSON.stringify(s.schedule_dates)}`);
        console.log(`  Status: ${s.status}`);
        console.log(`  Period: ${s.start_date || 'N/A'} to ${s.end_date || 'Ongoing'}`);
      });
    } else {
      console.log('⚠️ NO SCHEDULES FOUND IN DATABASE!');
      console.log('\n💡 This means:');
      console.log('   1. No schedules have been created in the admin panel');
      console.log('   2. Or schedules were deleted');
      console.log('   3. Or schedules are not being synced from web app to biometric app');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkAllSchedules();
