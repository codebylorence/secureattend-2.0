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

async function checkSchedules() {
  try {
    console.log('🔍 Checking all current schedules...\n');

    // Check all schedules
    const [schedules] = await sequelize.query(`
      SELECT es.*, e.firstname, e.lastname, e.employee_id
      FROM employee_schedules es
      LEFT JOIN employees e ON es.employee_id = e.id
      ORDER BY es.id DESC
      LIMIT 20
    `);
    
    console.log(`Found ${schedules.length} recent schedules:`);
    schedules.forEach(s => {
      console.log(`\nID: ${s.id}`);
      console.log(`  Employee: ${s.firstname} ${s.lastname} (${s.employee_id})`);
      console.log(`  Shift: ${s.shift_name} (${s.start_time} - ${s.end_time})`);
      console.log(`  Days: ${s.days}`);
      console.log(`  Schedule Dates: ${s.schedule_dates}`);
      console.log(`  Created: ${s.created_at}`);
    });

    // Check for schedules containing Feb dates
    console.log('\n\n📅 Checking schedules containing February 2026 dates:');
    const [febSchedules] = await sequelize.query(`
      SELECT es.*, e.firstname, e.lastname, e.employee_id
      FROM employee_schedules es
      LEFT JOIN employees e ON es.employee_id = e.id
      WHERE es.schedule_dates LIKE '%2026-02%'
      ORDER BY es.employee_id
    `);
    
    console.log(`\nFound ${febSchedules.length} schedules for February 2026:`);
    febSchedules.forEach(s => {
      console.log(`\n  ${s.firstname} ${s.lastname} (${s.employee_id}):`);
      console.log(`    Shift: ${s.shift_name} (${s.start_time} - ${s.end_time})`);
      console.log(`    Dates: ${s.schedule_dates}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

checkSchedules();
