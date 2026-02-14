import dotenv from 'dotenv';
dotenv.config();

import Attendance from '../models/attendance.js';
import Employee from '../models/employee.js';
import EmployeeSchedule from '../models/employeeSchedule.js';
import { Op } from 'sequelize';
import { getCurrentDateInTimezone } from '../utils/timezone.js';
import fs from 'fs';
import path from 'path';

async function checkLorenceOvertime() {
  try {
    const today = getCurrentDateInTimezone();
    const lorenceId = 'TSI00003'; // Lorence's employee ID
    
    console.log('='.repeat(60));
    console.log('🔍 CHECKING LORENCE OVERTIME ELIGIBILITY');
    console.log('='.repeat(60));
    console.log(`📅 Today: ${today}`);
    console.log(`👤 Employee ID: ${lorenceId}`);
    console.log('');
    
    // Get weekday
    const configPath = path.join(process.cwd(), 'config', 'system-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const timezone = config.timezone || 'UTC';
    
    const now = new Date();
    const todayWeekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long'
    }).format(now);
    
    console.log(`📅 Weekday: ${todayWeekday}`);
    console.log(`🌍 Timezone: ${timezone}`);
    console.log('');
    
    // Step 1: Check attendance
    console.log('STEP 1: Checking Attendance Record');
    console.log('-'.repeat(60));
    const attendance = await Attendance.findOne({
      where: {
        employee_id: lorenceId,
        date: today
      }
    });
    
    if (!attendance) {
      console.log('❌ No attendance record found for today');
      return;
    }
    
    console.log('✅ Attendance record found:');
    console.log(`   Status: ${attendance.status}`);
    console.log(`   Clock In: ${attendance.clock_in}`);
    console.log(`   Clock Out: ${attendance.clock_out}`);
    console.log(`   Overtime Hours: ${attendance.overtime_hours}`);
    console.log('');
    
    // Check eligibility criteria
    console.log('STEP 2: Checking Eligibility Criteria');
    console.log('-'.repeat(60));
    
    const isPresent = ['Present', 'Late'].includes(attendance.status);
    const hasClockedIn = attendance.clock_in !== null;
    const hasClockedOut = attendance.clock_out !== null;
    
    console.log(`   ✓ Status is Present/Late: ${isPresent ? '✅ YES' : '❌ NO'} (${attendance.status})`);
    console.log(`   ✓ Has clocked in: ${hasClockedIn ? '✅ YES' : '❌ NO'} (${attendance.clock_in})`);
    console.log(`   ✓ Has clocked out: ${hasClockedOut ? '✅ YES' : '❌ NO'} (${attendance.clock_out})`);
    console.log('');
    
    if (!isPresent || !hasClockedIn || !hasClockedOut) {
      console.log('❌ FAILED: Does not meet attendance criteria');
      if (!hasClockedOut) {
        console.log('   → Employee needs to clock out first');
      }
      return;
    }
    
    // Step 3: Check schedule
    console.log('STEP 3: Checking Schedule');
    console.log('-'.repeat(60));
    
    const schedules = await EmployeeSchedule.findAll({
      where: {
        employee_id: lorenceId,
        status: 'Active'
      }
    });
    
    console.log(`   Found ${schedules.length} active schedule(s) for ${lorenceId}`);
    
    if (schedules.length === 0) {
      console.log('❌ FAILED: No active schedules found');
      return;
    }
    
    schedules.forEach((schedule, index) => {
      console.log(`\n   Schedule ${index + 1}:`);
      console.log(`   - Days: ${JSON.stringify(schedule.days)}`);
      console.log(`   - Schedule Dates: ${JSON.stringify(schedule.schedule_dates)}`);
      console.log(`   - Shift: ${schedule.shift_name}`);
      console.log(`   - Start Date: ${schedule.start_date}`);
      console.log(`   - End Date: ${schedule.end_date}`);
    });
    
    // Check if scheduled for today
    const isScheduledToday = schedules.some(schedule => {
      const scheduleDatesStr = JSON.stringify(schedule.schedule_dates || {});
      const daysStr = JSON.stringify(schedule.days || []);
      
      const hasSpecificDate = scheduleDatesStr.includes(today);
      const hasWeekday = daysStr.includes(todayWeekday);
      
      console.log(`\n   Checking schedule ${schedule.id}:`);
      console.log(`   - Has specific date (${today}): ${hasSpecificDate}`);
      console.log(`   - Has weekday (${todayWeekday}): ${hasWeekday}`);
      
      return hasSpecificDate || hasWeekday;
    });
    
    console.log(`\n   ✓ Scheduled for today: ${isScheduledToday ? '✅ YES' : '❌ NO'}`);
    console.log('');
    
    if (!isScheduledToday) {
      console.log('❌ FAILED: Not scheduled for today');
      return;
    }
    
    // Step 4: Check if already has overtime
    console.log('STEP 4: Checking Existing Overtime');
    console.log('-'.repeat(60));
    
    const hasOvertime = await Attendance.findOne({
      where: {
        employee_id: lorenceId,
        date: today,
        status: 'Overtime'
      }
    });
    
    console.log(`   ✓ Already has overtime: ${hasOvertime ? '❌ YES' : '✅ NO'}`);
    console.log('');
    
    if (hasOvertime) {
      console.log('❌ FAILED: Already has overtime assigned');
      return;
    }
    
    // Step 5: Get employee details
    console.log('STEP 5: Employee Details');
    console.log('-'.repeat(60));
    
    const employee = await Employee.findOne({
      where: { employee_id: lorenceId }
    });
    
    if (employee) {
      console.log(`   Name: ${employee.firstname} ${employee.lastname}`);
      console.log(`   Department: ${employee.department}`);
      console.log(`   Position: ${employee.position}`);
    }
    console.log('');
    
    console.log('='.repeat(60));
    console.log('✅ RESULT: ELIGIBLE FOR OVERTIME');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

checkLorenceOvertime();
