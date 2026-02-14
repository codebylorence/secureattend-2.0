import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import Attendance from '../models/attendance.js';
import Employee from '../models/employee.js';
import EmployeeSchedule from '../models/employeeSchedule.js';

dotenv.config();

const checkFernandoAbsent = async () => {
  try {
    console.log('========================================');
    console.log('🔍 CHECKING FERNANDO ABSENT ISSUE');
    console.log('========================================\n');
    
    const fernandoId = 'TSI00003';
    const checkDate = '2026-02-14';
    
    // Get current time in Philippines
    const now = new Date();
    const philippinesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log(`📅 Current time (Philippines): ${philippinesTime.toISOString()}`);
    console.log(`📅 Checking date: ${checkDate}\n`);
    
    // Check employee
    const employee = await Employee.findOne({
      where: { employee_id: fernandoId }
    });
    
    if (!employee) {
      console.log('❌ Employee not found!');
      return;
    }
    
    console.log('👤 EMPLOYEE INFO:');
    console.log(`   ID: ${employee.employee_id}`);
    console.log(`   Name: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Department: ${employee.department_id}\n`);
    
    // Check schedules for Feb 14
    console.log('📋 SCHEDULES FOR FEB 14, 2026:');
    const schedules = await EmployeeSchedule.findAll({
      where: { employee_id: fernandoId }
    });
    
    if (schedules.length === 0) {
      console.log('   ❌ No schedules found for Fernando\n');
    } else {
      console.log(`   Found ${schedules.length} schedule(s):\n`);
      
      let hasScheduleForFeb14 = false;
      
      schedules.forEach((sched, index) => {
        console.log(`   Schedule ${index + 1}:`);
        console.log(`     Shift: ${sched.shift_name}`);
        console.log(`     Time: ${sched.start_time} - ${sched.end_time}`);
        console.log(`     Days: ${sched.days}`);
        console.log(`     Specific Dates: ${sched.schedule_dates || 'None'}`);
        
        // Check if scheduled for Feb 14 (Friday)
        const isFriday = sched.days && sched.days.includes('Friday');
        const hasSpecificDate = sched.schedule_dates && sched.schedule_dates.includes('2026-02-14');
        
        if (isFriday || hasSpecificDate) {
          hasScheduleForFeb14 = true;
          console.log(`     ✅ SCHEDULED FOR FEB 14!`);
        } else {
          console.log(`     ❌ NOT scheduled for Feb 14`);
        }
        console.log('');
      });
      
      console.log(`\n   Summary: Fernando ${hasScheduleForFeb14 ? 'IS' : 'IS NOT'} scheduled for Feb 14, 2026\n`);
    }
    
    // Check attendance record for Feb 14
    console.log('📊 ATTENDANCE RECORD FOR FEB 14:');
    const attendance = await Attendance.findOne({
      where: {
        employee_id: fernandoId,
        date: checkDate
      }
    });
    
    if (attendance) {
      console.log('   ✓ Found attendance record:');
      console.log(`     Clock In: ${attendance.clock_in || 'NULL'}`);
      console.log(`     Clock Out: ${attendance.clock_out || 'NULL'}`);
      console.log(`     Status: ${attendance.status}`);
      console.log(`     Created: ${attendance.createdAt}`);
      console.log(`     Updated: ${attendance.updatedAt}`);
      
      console.log(`\n   📅 Record created at: ${new Date(attendance.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Manila' })} (Philippines time)`);
      
      // Determine if this is correct
      console.log(`\n   ⚠️ ANALYSIS:`);
      if (attendance.status === 'Absent') {
        const hasSchedule = schedules.some(s => 
          (s.days && s.days.includes('Friday')) || 
          (s.schedule_dates && s.schedule_dates.includes('2026-02-14'))
        );
        
        if (hasSchedule) {
          console.log(`     ✅ Correctly marked as Absent (was scheduled but didn't attend)`);
        } else {
          console.log(`     ❌ INCORRECTLY marked as Absent (was NOT scheduled for this day!)`);
          console.log(`     💡 This absent record should be deleted`);
        }
      }
    } else {
      console.log('   ❌ No attendance record for Feb 14, 2026\n');
      
      // Check if should be marked absent
      const hasSchedule = schedules.some(s => 
        (s.days && s.days.includes('Friday')) || 
        (s.schedule_dates && s.schedule_dates.includes('2026-02-14'))
      );
      
      if (hasSchedule) {
        console.log(`   ⚠️ Should be marked as Absent (scheduled but no attendance record)`);
      } else {
        console.log(`   ✓ Correctly has no record (not scheduled for this day)`);
      }
    }
    
    console.log('\n========================================');
    console.log('🔍 END CHECK');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
};

checkFernandoAbsent();
