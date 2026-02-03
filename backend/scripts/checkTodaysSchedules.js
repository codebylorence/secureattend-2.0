import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

async function checkTodaysSchedules() {
  try {
    console.log('🔍 Checking today\'s schedules...');
    
    // Get today's information
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const today = dayNames[now.getDay()];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log(`📅 Today is: ${today} (${todayDate})`);
    
    // Check schedule_templates for today's date
    const [scheduleTemplates] = await sequelize.query(`
      SELECT id, shift_name, department, specific_date, assigned_employees, createdAt
      FROM schedule_templates 
      WHERE specific_date = '${todayDate}'
      ORDER BY createdAt DESC
    `);
    
    console.log(`📋 Schedule Templates for today (${todayDate}):`, scheduleTemplates.length);
    scheduleTemplates.forEach(template => {
      let assignedCount = 0;
      if (template.assigned_employees) {
        try {
          const assigned = JSON.parse(template.assigned_employees);
          assignedCount = assigned.length;
        } catch (e) {
          console.error('Error parsing assigned_employees:', e);
        }
      }
      console.log(`  - ${template.shift_name} (${template.department}): ${assignedCount} employees assigned`);
    });
    
    // Check employee_schedules for today
    const [employeeSchedules] = await sequelize.query(`
      SELECT id, employee_id, template_id, days, schedule_dates, createdAt
      FROM employee_schedules 
      WHERE JSON_CONTAINS(days, '"${today}"')
      ORDER BY createdAt DESC
    `);
    
    console.log(`👥 Employee Schedules containing ${today}:`, employeeSchedules.length);
    employeeSchedules.forEach(schedule => {
      console.log(`  - Employee ${schedule.employee_id}: Template ${schedule.template_id} on days [${schedule.days}]`);
      if (schedule.schedule_dates) {
        try {
          const dates = JSON.parse(schedule.schedule_dates);
          console.log(`    Schedule dates:`, dates);
        } catch (e) {
          console.error('Error parsing schedule_dates:', e);
        }
      }
    });
    
    // Check for any schedules that might match today
    const [allSchedules] = await sequelize.query(`
      SELECT id, employee_id, template_id, days, schedule_dates, createdAt
      FROM employee_schedules 
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log(`📊 Recent Employee Schedules (last 10):`);
    allSchedules.forEach(schedule => {
      console.log(`  - Employee ${schedule.employee_id}: Template ${schedule.template_id}`);
      console.log(`    Days: ${schedule.days}`);
      if (schedule.schedule_dates) {
        console.log(`    Schedule dates: ${schedule.schedule_dates}`);
      }
      console.log(`    Created: ${schedule.createdAt}`);
      console.log('    ---');
    });
    
    await sequelize.close();
    console.log('✅ Schedule check completed');
  } catch (error) {
    console.error('❌ Error checking schedules:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkTodaysSchedules();