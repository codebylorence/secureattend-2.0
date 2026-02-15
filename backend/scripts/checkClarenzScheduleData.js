import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Sequelize with DATABASE_URL from .env
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function checkClarenzData() {
  try {
    console.log('🔍 Checking Clarenz schedule data...\n');
    
    const today = '2026-02-15';
    
    // Find Clarenz in employees
    const [employees] = await sequelize.query(`
      SELECT employee_id, firstname, lastname, department, position
      FROM employees
      WHERE firstname ILIKE '%clarenz%' OR lastname ILIKE '%clarenz%'
    `);
    
    console.log('👤 Clarenz employee record:');
    console.log(employees);
    console.log('');
    
    if (employees.length === 0) {
      console.log('❌ No employee found with name Clarenz');
      return;
    }
    
    const clarenzId = employees[0].employee_id;
    console.log(`📋 Using employee_id: ${clarenzId}\n`);
    
    // Check attendance today
    const [attendance] = await sequelize.query(`
      SELECT employee_id, date, status, clock_in, clock_out
      FROM attendances
      WHERE employee_id = :empId AND date = :today
    `, {
      replacements: { empId: clarenzId, today }
    });
    
    console.log('📅 Attendance record for today:');
    console.log(attendance);
    console.log('');
    
    // Check schedules
    const [schedules] = await sequelize.query(`
      SELECT id, employee_id, template_id, days, schedule_dates, 
             shift_name, shift_start, shift_end, start_date, end_date, status
      FROM employee_schedules
      WHERE employee_id = :empId AND status = 'Active'
    `, {
      replacements: { empId: clarenzId }
    });
    
    console.log('📋 Active schedules:');
    console.log(JSON.stringify(schedules, null, 2));
    console.log('');
    
    // Check if today is in schedule_dates
    if (schedules.length > 0) {
      console.log('🔍 Checking if today is in schedule_dates:');
      schedules.forEach((schedule, idx) => {
        console.log(`\nSchedule ${idx + 1}:`);
        console.log(`  schedule_dates type: ${typeof schedule.schedule_dates}`);
        console.log(`  schedule_dates value:`, schedule.schedule_dates);
        
        if (schedule.schedule_dates) {
          try {
            const dates = typeof schedule.schedule_dates === 'string' 
              ? JSON.parse(schedule.schedule_dates) 
              : schedule.schedule_dates;
            
            console.log(`  Parsed dates:`, dates);
            console.log(`  Is array?`, Array.isArray(dates));
            console.log(`  Is object?`, typeof dates === 'object' && !Array.isArray(dates));
            
            if (Array.isArray(dates)) {
              console.log(`  ✅ Array format - includes today? ${dates.includes(today)}`);
            } else if (typeof dates === 'object') {
              console.log(`  ✅ Object format - checking all days...`);
              Object.entries(dates).forEach(([day, dayDates]) => {
                console.log(`    ${day}: ${dayDates.includes(today) ? '✅ INCLUDES TODAY' : dayDates.join(', ')}`);
              });
            }
          } catch (error) {
            console.log(`  ❌ Error parsing:`, error.message);
          }
        }
      });
    }
    
    // Check if already has overtime
    const [overtime] = await sequelize.query(`
      SELECT employee_id, date, status
      FROM attendances
      WHERE employee_id = :empId AND date = :today AND status = 'Overtime'
    `, {
      replacements: { empId: clarenzId, today }
    });
    
    console.log('\n⏰ Overtime status:');
    if (overtime.length > 0) {
      console.log('❌ Already has overtime assigned');
      console.log(overtime);
    } else {
      console.log('✅ No overtime assigned yet');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkClarenzData();
