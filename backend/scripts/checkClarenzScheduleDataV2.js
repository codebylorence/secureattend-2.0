import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Sequelize, Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models directly
import Employee from '../models/employee.js';
import Attendance from '../models/attendance.js';
import EmployeeSchedule from '../models/employeeSchedule.js';

async function checkClarenzData() {
  try {
    console.log('🔍 Checking Clarenz schedule data...\n');
    
    const today = '2026-02-15';
    
    // Find Clarenz in employees
    const employees = await Employee.findAll({
      where: {
        firstname: {
          [Op.iLike]: '%clarenz%'
        }
      }
    });
    
    console.log('👤 Clarenz employee record:');
    console.log(JSON.stringify(employees, null, 2));
    console.log('');
    
    if (employees.length === 0) {
      console.log('❌ No employee found with name Clarenz');
      return;
    }
    
    const clarenzId = employees[0].employee_id;
    console.log(`📋 Using employee_id: ${clarenzId}\n`);
    
    // Check attendance today
    const attendance = await Attendance.findAll({
      where: {
        employee_id: clarenzId,
        date: today
      }
    });
    
    console.log('📅 Attendance records for today:');
    console.log(JSON.stringify(attendance, null, 2));
    console.log('');
    
    // Check schedules
    const schedules = await EmployeeSchedule.findAll({
      where: {
        employee_id: clarenzId,
        status: 'Active'
      }
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
                const includesToday = Array.isArray(dayDates) && dayDates.includes(today);
                console.log(`    ${day}: ${includesToday ? '✅ INCLUDES TODAY' : dayDates.join(', ')}`);
              });
            }
          } catch (error) {
            console.log(`  ❌ Error parsing:`, error.message);
          }
        }
      });
    }
    
    // Check if already has overtime
    const overtime = await Attendance.findAll({
      where: {
        employee_id: clarenzId,
        date: today,
        status: 'Overtime'
      }
    });
    
    console.log('\n⏰ Overtime status:');
    if (overtime.length > 0) {
      console.log('❌ Already has overtime assigned');
      console.log(JSON.stringify(overtime, null, 2));
    } else {
      console.log('✅ No overtime assigned yet');
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`  Employee: ${clarenzId} (${employees[0].firstname} ${employees[0].lastname})`);
    console.log(`  Clocked in today: ${attendance.length > 0 ? '✅ YES' : '❌ NO'}`);
    if (attendance.length > 0) {
      console.log(`  Status: ${attendance[0].status}`);
      console.log(`  Clock in: ${attendance[0].clock_in}`);
      console.log(`  Clock out: ${attendance[0].clock_out || 'Not yet'}`);
    }
    console.log(`  Has active schedule: ${schedules.length > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`  Already has overtime: ${overtime.length > 0 ? '❌ YES' : '✅ NO'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

checkClarenzData();
