import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Employee from '../models/employee.js';
import Attendance from '../models/attendance.js';

async function testNewOvertimeLogic() {
  try {
    const today = '2026-02-15';
    
    console.log('🧪 Testing new overtime eligibility logic...\n');
    
    // Step 1: Get all employees who clocked in today
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

    console.log(`📊 Found ${todayAttendances.length} employees who clocked in today:`);
    todayAttendances.forEach(a => {
      console.log(`  - ${a.employee_id}: ${a.status}, in: ${a.clock_in}, out: ${a.clock_out || 'not yet'}`);
    });
    console.log('');

    // Step 2: Get employee IDs
    const clockedInEmployeeIds = todayAttendances.map(att => att.employee_id);

    // Step 3: Check who already has overtime
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
      } else {
        console.log(`  ⏰ ${empId} already has overtime`);
      }
    }

    console.log(`\n📊 Employees eligible for overtime (${employeesWithoutOvertime.length}):`, employeesWithoutOvertime);

    // Step 4: Get employee details
    const eligibleEmployees = await Employee.findAll({
      where: {
        employee_id: {
          [Op.in]: employeesWithoutOvertime
        }
      }
    });

    console.log(`\n✅ Final eligible employees:\n`);
    eligibleEmployees.forEach(emp => {
      console.log(`  - ${emp.employee_id}: ${emp.firstname} ${emp.lastname} (${emp.department})`);
    });
    
    console.log(`\n🎯 Clarenz (TSI00061) is ${employeesWithoutOvertime.includes('TSI00061') ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testNewOvertimeLogic();
