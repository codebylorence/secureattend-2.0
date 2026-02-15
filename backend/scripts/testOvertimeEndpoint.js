import dotenv from 'dotenv';
dotenv.config();

import Attendance from '../models/attendance.js';
import Employee from '../models/employee.js';
import EmployeeSchedule from '../models/employeeSchedule.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { getCurrentDateInTimezone } from '../utils/timezone.js';
import fs from 'fs';
import path from 'path';

async function testOvertimeEndpoint() {
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
    
    console.log(`📅 Testing overtime endpoint for ${today} (${todayWeekday}) in timezone ${timezone}\n`);
    
    // Step 1: Get all employees who have clocked in today (Present or Late)
    const todayAttendances = await Attendance.findAll({
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

    console.log(`STEP 1: Found ${todayAttendances.length} employees who clocked in today:`);
    todayAttendances.forEach(a => {
      console.log(`  - ${a.employee_id} (${a.status}, in: ${a.clock_in}, out: ${a.clock_out || 'not yet'})`);
    });
    console.log('');

    if (todayAttendances.length === 0) {
      console.log(`❌ No employees clocked in today\n`);
      return;
    }

    // Step 2: Get employee IDs who clocked in
    const clockedInEmployeeIds = todayAttendances.map(att => att.employee_id);
    console.log(`STEP 2: Clocked in employee IDs:`, clockedInEmployeeIds);
    console.log('');

    // Step 3: Get all employee schedules for today using specific date only
    console.log(`STEP 3: Querying schedules with:`);
    console.log(`  - status: 'Active'`);
    console.log(`  - employee_id IN [${clockedInEmployeeIds.join(', ')}]`);
    console.log(`  - schedule_dates contains '${today}'`);
    console.log('');
    
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

    console.log(`STEP 3 RESULT: Found ${employeeSchedules.length} employee schedules:`);
    employeeSchedules.forEach(s => {
      console.log(`  - ${s.employee_id}:`);
      console.log(`    days: ${JSON.stringify(s.days)}`);
      console.log(`    schedule_dates: ${JSON.stringify(s.schedule_dates)}`);
      console.log(`    shift: ${s.shift_name}`);
    });
    console.log('');
    
    // Step 4: Get employee IDs who are scheduled today
    const scheduledEmployeeIds = [...new Set(employeeSchedules.map(schedule => schedule.employee_id))];
    console.log(`STEP 4: Scheduled employee IDs (${scheduledEmployeeIds.length}):`, scheduledEmployeeIds);
    console.log('');

    // Step 5: Find intersection
    const eligibleEmployeeIds = clockedInEmployeeIds.filter(empId => 
      scheduledEmployeeIds.includes(empId)
    );
    
    console.log(`STEP 5: Eligible employee IDs (scheduled AND clocked in):`, eligibleEmployeeIds);
    console.log('');

    if (eligibleEmployeeIds.length === 0) {
      console.log(`❌ No employees are both scheduled and clocked in today`);
      console.log(`  Clocked in but not scheduled:`, clockedInEmployeeIds.filter(id => !scheduledEmployeeIds.includes(id)));
      console.log(`  Scheduled but not clocked in:`, scheduledEmployeeIds.filter(id => !clockedInEmployeeIds.includes(id)));
      console.log('');
      return;
    }

    // Step 6: Get employee details
    const eligibleEmployees = await Employee.findAll({
      where: {
        employee_id: {
          [Op.in]: eligibleEmployeeIds
        }
      }
    });

    console.log(`STEP 6: Found ${eligibleEmployees.length} eligible employee records`);
    console.log('');

    // Step 7: Filter out employees who already have overtime
    console.log(`STEP 7: Checking for existing overtime...`);
    const employeesWithoutOvertime = [];
    for (const employee of eligibleEmployees) {
      const hasOvertime = await Attendance.findOne({
        where: {
          employee_id: employee.employee_id,
          date: today,
          status: "Overtime"
        }
      });

      console.log(`  - ${employee.employee_id}: hasOvertime=${!!hasOvertime}`);

      if (!hasOvertime) {
        const employeeData = employee.toJSON();
        employeesWithoutOvertime.push({
          ...employeeData,
          firstname: employeeData.firstname || '',
          lastname: employeeData.lastname || ''
        });
      }
    }
    console.log('');

    console.log(`✅ FINAL RESULT: ${employeesWithoutOvertime.length} overtime eligible employees`);
    employeesWithoutOvertime.forEach(e => {
      console.log(`  - ${e.employee_id}: ${e.firstname} ${e.lastname} (${e.department})`);
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testOvertimeEndpoint();
