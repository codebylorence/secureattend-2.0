import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { getCurrentDateInTimezone } from "../utils/timezone.js";
import fs from 'fs';
import path from 'path';

async function debugOvertimeEligible() {
  try {
    const today = getCurrentDateInTimezone();
    
    // Get weekday in the configured timezone
    const configPath = path.join(process.cwd(), 'backend', 'config', 'system-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const timezone = config.timezone || 'UTC';
    
    const now = new Date();
    const todayWeekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long'
    }).format(now);
    
    console.log(`\n📅 Debugging overtime eligible employees for ${today} (${todayWeekday}) in timezone ${timezone}`);
    console.log(`⏰ Current time: ${now.toLocaleString('en-US', { timeZone: timezone })}`);
    
    // Step 1: Check today's attendances
    console.log(`\n=== STEP 1: Today's Attendances ===`);
    const todayAttendances = await Attendance.findAll({
      where: {
        date: today
      },
      order: [['employee_id', 'ASC']]
    });
    
    console.log(`Found ${todayAttendances.length} attendance records for today:`);
    todayAttendances.forEach(att => {
      console.log(`  - ${att.employee_id}: ${att.status}, clock_in: ${att.clock_in || 'NULL'}, clock_out: ${att.clock_out || 'NULL'}`);
    });
    
    // Step 2: Check who clocked in (Present or Late)
    console.log(`\n=== STEP 2: Clocked In Employees ===`);
    const clockedInAttendances = await Attendance.findAll({
      where: {
        date: today,
        status: {
          [Op.in]: ["Present", "Late"]
        },
        clock_in: {
          [Op.not]: null
        }
      }
    });
    
    console.log(`Found ${clockedInAttendances.length} employees who clocked in:`);
    const clockedInEmployeeIds = clockedInAttendances.map(att => att.employee_id);
    clockedInEmployeeIds.forEach(id => console.log(`  - ${id}`));
    
    if (clockedInEmployeeIds.length === 0) {
      console.log(`\n❌ No employees clocked in today. Cannot assign overtime.`);
      return;
    }
    
    // Step 3: Check schedules for today
    console.log(`\n=== STEP 3: Today's Schedules ===`);
    const allSchedules = await EmployeeSchedule.findAll({
      where: {
        status: 'Active'
      },
      order: [['employee_id', 'ASC']]
    });
    
    console.log(`Found ${allSchedules.length} active schedules in database`);
    
    // Check which schedules match today's date
    console.log(`\nChecking which schedules match today (${today}):`);
    const matchingSchedules = allSchedules.filter(s => {
      const scheduleDates = s.schedule_dates || '[]';
      const hasToday = scheduleDates.includes(today);
      console.log(`  - ${s.employee_id}: schedule_dates=${scheduleDates.substring(0, 100)}... hasToday=${hasToday}`);
      return hasToday;
    });
    
    console.log(`\nFound ${matchingSchedules.length} schedules matching today's date`);
    
    // Step 4: Check schedules for clocked-in employees only
    console.log(`\n=== STEP 4: Schedules for Clocked-In Employees ===`);
    const employeeSchedules = await EmployeeSchedule.findAll({
      where: {
        status: 'Active',
        employee_id: {
          [Op.in]: clockedInEmployeeIds
        },
        [Op.or]: [
          sequelize.literal(`schedule_dates::text LIKE '%${today}%'`)
        ]
      }
    });
    
    console.log(`Found ${employeeSchedules.length} schedules for clocked-in employees:`);
    employeeSchedules.forEach(s => {
      console.log(`  - ${s.employee_id}: ${s.shift_name} (${s.shift_start} - ${s.shift_end})`);
    });
    
    // Step 5: Check shift end times
    console.log(`\n=== STEP 5: Shift End Time Check ===`);
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      timeZone: timezone, 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    console.log(`Current time: ${currentTime}`);
    
    const activeSchedules = employeeSchedules.filter(schedule => {
      if (!schedule.shift_end) {
        console.log(`  - ${schedule.employee_id}: No shift_end, allowing overtime`);
        return true;
      }
      
      const shiftEndTime = schedule.shift_end;
      const isShiftActive = currentTime <= shiftEndTime;
      
      console.log(`  - ${schedule.employee_id}: shift ends at ${shiftEndTime}, active: ${isShiftActive}`);
      return isShiftActive;
    });
    
    console.log(`\nFound ${activeSchedules.length} active schedules (shift not ended)`);
    
    // Step 6: Get eligible employee IDs
    console.log(`\n=== STEP 6: Eligible Employees ===`);
    const scheduledEmployeeIds = [...new Set(activeSchedules.map(s => s.employee_id))];
    const eligibleEmployeeIds = clockedInEmployeeIds.filter(empId => 
      scheduledEmployeeIds.includes(empId)
    );
    
    console.log(`Eligible employee IDs (${eligibleEmployeeIds.length}):`, eligibleEmployeeIds);
    
    if (eligibleEmployeeIds.length === 0) {
      console.log(`\n❌ No eligible employees found`);
      console.log(`Clocked in but not scheduled:`, clockedInEmployeeIds.filter(id => !scheduledEmployeeIds.includes(id)));
      console.log(`Scheduled but not clocked in:`, scheduledEmployeeIds.filter(id => !clockedInEmployeeIds.includes(id)));
      return;
    }
    
    // Step 7: Check for existing overtime
    console.log(`\n=== STEP 7: Check Existing Overtime ===`);
    for (const empId of eligibleEmployeeIds) {
      const hasOvertime = await Attendance.findOne({
        where: {
          employee_id: empId,
          date: today,
          status: "Overtime"
        }
      });
      
      console.log(`  - ${empId}: hasOvertime=${!!hasOvertime}`);
    }
    
    // Step 8: Get employee details
    console.log(`\n=== STEP 8: Employee Details ===`);
    const employees = await Employee.findAll({
      where: {
        employee_id: {
          [Op.in]: eligibleEmployeeIds
        }
      }
    });
    
    console.log(`Found ${employees.length} employee records:`);
    employees.forEach(emp => {
      console.log(`  - ${emp.employee_id}: ${emp.firstname} ${emp.lastname} (${emp.department})`);
    });
    
    console.log(`\n✅ Debug complete`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

debugOvertimeEligible();
