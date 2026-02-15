import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import { getCurrentDateInTimezone } from "../utils/timezone.js";

async function checkClarenz() {
  try {
    const today = getCurrentDateInTimezone();
    console.log(`\n📅 Checking Clarenz for overtime eligibility on ${today}`);
    console.log(`=`.repeat(60));
    
    // Step 1: Find Clarenz in employees
    console.log(`\n1️⃣ Finding Clarenz in employee database...`);
    const clarenz = await Employee.findOne({
      where: {
        firstname: 'Clarenz'
      }
    });
    
    if (!clarenz) {
      console.log(`❌ Clarenz not found in employee database`);
      return;
    }
    
    console.log(`✅ Found Clarenz:`);
    console.log(`   Employee ID: ${clarenz.employee_id}`);
    console.log(`   Name: ${clarenz.firstname} ${clarenz.lastname}`);
    console.log(`   Department: ${clarenz.department}`);
    console.log(`   Position: ${clarenz.position}`);
    
    const employeeId = clarenz.employee_id;
    
    // Step 2: Check attendance for today
    console.log(`\n2️⃣ Checking attendance for today (${today})...`);
    const attendance = await Attendance.findOne({
      where: {
        employee_id: employeeId,
        date: today
      }
    });
    
    if (!attendance) {
      console.log(`❌ No attendance record found for today`);
      console.log(`   Reason: Clarenz has not clocked in yet`);
      return;
    }
    
    console.log(`✅ Attendance record found:`);
    console.log(`   Status: ${attendance.status}`);
    console.log(`   Clock In: ${attendance.clock_in || 'NULL'}`);
    console.log(`   Clock Out: ${attendance.clock_out || 'NULL'}`);
    
    // Check if status is Present or Late
    if (attendance.status !== 'Present' && attendance.status !== 'Late') {
      console.log(`❌ Status is "${attendance.status}" (must be "Present" or "Late")`);
      return;
    }
    
    // Check if clocked in
    if (!attendance.clock_in) {
      console.log(`❌ No clock-in time recorded`);
      return;
    }
    
    console.log(`✅ Clarenz has clocked in with status: ${attendance.status}`);
    
    // Step 3: Check if already has overtime
    console.log(`\n3️⃣ Checking if already assigned overtime...`);
    const hasOvertime = await Attendance.findOne({
      where: {
        employee_id: employeeId,
        date: today,
        status: 'Overtime'
      }
    });
    
    if (hasOvertime) {
      console.log(`❌ Already has overtime assigned`);
      return;
    }
    
    console.log(`✅ No overtime assigned yet`);
    
    // Step 4: Check schedule for today
    console.log(`\n4️⃣ Checking schedule for today...`);
    const schedules = await EmployeeSchedule.findAll({
      where: {
        employee_id: employeeId,
        status: 'Active'
      }
    });
    
    console.log(`   Found ${schedules.length} active schedule(s)`);
    
    if (schedules.length === 0) {
      console.log(`❌ No active schedules found`);
      return;
    }
    
    // Check which schedules include today
    let todaySchedule = null;
    for (const schedule of schedules) {
      console.log(`\n   Schedule #${schedule.id}:`);
      console.log(`     Shift: ${schedule.shift_name}`);
      console.log(`     Times: ${schedule.shift_start} - ${schedule.shift_end}`);
      console.log(`     Days: ${schedule.days}`);
      console.log(`     Schedule Dates: ${schedule.schedule_dates}`);
      
      // Check if today is in schedule_dates
      if (schedule.schedule_dates) {
        try {
          const dates = typeof schedule.schedule_dates === 'string' 
            ? JSON.parse(schedule.schedule_dates) 
            : schedule.schedule_dates;
          
          const hasToday = Array.isArray(dates) && dates.includes(today);
          console.log(`     Includes today (${today}): ${hasToday ? '✅ YES' : '❌ NO'}`);
          
          if (hasToday) {
            todaySchedule = schedule;
          }
        } catch (error) {
          console.log(`     ⚠️ Error parsing schedule_dates: ${error.message}`);
        }
      } else {
        console.log(`     ⚠️ No schedule_dates field`);
      }
    }
    
    if (!todaySchedule) {
      console.log(`\n❌ Clarenz is not scheduled to work today (${today})`);
      console.log(`   This is why Clarenz cannot be assigned overtime`);
      return;
    }
    
    console.log(`\n✅ Clarenz is scheduled to work today:`);
    console.log(`   Shift: ${todaySchedule.shift_name}`);
    console.log(`   Times: ${todaySchedule.shift_start} - ${todaySchedule.shift_end}`);
    
    // Step 5: Check if shift has ended
    console.log(`\n5️⃣ Checking if shift has ended...`);
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      timeZone: 'Asia/Manila', 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`   Current time: ${currentTime}`);
    console.log(`   Shift ends at: ${todaySchedule.shift_end}`);
    
    if (currentTime > todaySchedule.shift_end) {
      console.log(`❌ Shift has already ended`);
      console.log(`   Overtime cannot be assigned after shift ends`);
      return;
    }
    
    console.log(`✅ Shift is still active`);
    
    // Final verdict
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ CLARENZ IS ELIGIBLE FOR OVERTIME!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nSummary:`);
    console.log(`  ✅ Employee exists: ${clarenz.employee_id}`);
    console.log(`  ✅ Clocked in today: ${attendance.status}`);
    console.log(`  ✅ No overtime assigned yet`);
    console.log(`  ✅ Scheduled to work today: ${todaySchedule.shift_name}`);
    console.log(`  ✅ Shift still active: ${todaySchedule.shift_start} - ${todaySchedule.shift_end}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

checkClarenz();
