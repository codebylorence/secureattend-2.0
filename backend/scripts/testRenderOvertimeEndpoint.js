import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Employee from '../models/employee.js';
import Attendance from '../models/attendance.js';
import { Op } from 'sequelize';

// Simulate the exact logic from getOvertimeEligibleEmployees
async function testOvertimeLogic() {
  try {
    console.log('🧪 Testing overtime eligibility logic (simulating Render)...\n');
    
    const today = '2026-02-15';
    
    console.log(`📅 Date: ${today}\n`);
    
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

    console.log(`Step 1: Found ${todayAttendances.length} employees who clocked in today:`);
    todayAttendances.forEach(a => {
      console.log(`  - ${a.employee_id}: ${a.status}, in: ${a.clock_in}, out: ${a.clock_out || 'not yet'}`);
    });
    console.log('');

    if (todayAttendances.length === 0) {
      console.log('❌ No employees clocked in today, would return empty list');
      return;
    }

    // Step 2: Get employee IDs who clocked in
    const clockedInEmployeeIds = todayAttendances.map(att => att.employee_id);
    console.log(`Step 2: Clocked in employee IDs:`, clockedInEmployeeIds);
    console.log('');

    // Step 3: Check if already has overtime status
    const employeesWithoutOvertime = [];
    for (const empId of clockedInEmployeeIds) {
      const hasOvertime = await Attendance.findOne({
        where: {
          employee_id: empId,
          date: today,
          status: "Overtime"
        }
      });

      if (!hasOvertime) {
        employeesWithoutOvertime.push(empId);
        console.log(`  ✅ ${empId}: No overtime yet`);
      } else {
        console.log(`  ❌ ${empId}: Already has overtime`);
      }
    }

    console.log(`\nStep 3: Employees without overtime (${employeesWithoutOvertime.length}):`, employeesWithoutOvertime);
    console.log('');

    if (employeesWithoutOvertime.length === 0) {
      console.log('❌ All clocked-in employees already have overtime assigned');
      return;
    }

    // Step 4: Get employee details for eligible employees
    const eligibleEmployees = await Employee.findAll({
      where: {
        employee_id: {
          [Op.in]: employeesWithoutOvertime
        }
      }
    });

    console.log(`Step 4: Found ${eligibleEmployees.length} eligible employee records\n`);

    // Return employee data with firstname and lastname
    const result = eligibleEmployees.map(employee => {
      const employeeData = employee.toJSON();
      return {
        ...employeeData,
        firstname: employeeData.firstname || '',
        lastname: employeeData.lastname || ''
      };
    });

    console.log(`✅ Final result: ${result.length} overtime eligible employees\n`);
    result.forEach(e => {
      console.log(`  - ${e.employee_id}: ${e.firstname} ${e.lastname} (${e.department})`);
    });
    
    console.log(`\n🎯 Clarenz (TSI00061) is ${result.find(e => e.employee_id === 'TSI00061') ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testOvertimeLogic();
