import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import Attendance from '../models/attendance.js';
import Employee from '../models/employee.js';
import EmployeeSchedule from '../models/employeeSchedule.js';

dotenv.config();

const checkLorenceAbsent = async () => {
  try {
    console.log('========================================');
    console.log('🔍 CHECKING LORENCE ABSENT ISSUE');
    console.log('========================================\n');
    
    const lorenceId = 'TSI12345';
    
    // Get current time in Philippines
    const now = new Date();
    const philippinesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    console.log(`📅 Current time (Philippines): ${philippinesTime.toISOString()}`);
    console.log(`📅 Current time (formatted): ${philippinesTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}\n`);
    
    // Check employee
    const employee = await Employee.findOne({
      where: { employee_id: lorenceId }
    });
    
    if (!employee) {
      console.log('❌ Employee not found!');
      return;
    }
    
    console.log('👤 EMPLOYEE INFO:');
    console.log(`   ID: ${employee.employee_id}`);
    console.log(`   Name: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Department: ${employee.department_id}\n`);
    
    // Check schedules
    console.log('📋 SCHEDULES:');
    const schedules = await EmployeeSchedule.findAll({
      where: { employee_id: lorenceId }
    });
    
    if (schedules.length === 0) {
      console.log('   ❌ No schedules found\n');
    } else {
      console.log(`   Found ${schedules.length} schedule(s):\n`);
      schedules.forEach((sched, index) => {
        console.log(`   Schedule ${index + 1}:`);
        console.log(`     Shift: ${sched.shift_name}`);
        console.log(`     Time: ${sched.start_time} - ${sched.end_time}`);
        console.log(`     Days: ${sched.days}`);
        console.log(`     Specific Dates: ${sched.schedule_dates || 'None'}`);
        console.log(`     Created: ${sched.createdAt}`);
        console.log('');
      });
    }
    
    // Check attendance records
    console.log('📊 ATTENDANCE RECORDS:');
    const attendances = await Attendance.findAll({
      where: { employee_id: lorenceId },
      order: [['date', 'DESC']],
      limit: 5
    });
    
    if (attendances.length === 0) {
      console.log('   ❌ No attendance records found\n');
    } else {
      console.log(`   Found ${attendances.length} recent record(s):\n`);
      attendances.forEach((att, index) => {
        console.log(`   Record ${index + 1}:`);
        console.log(`     Date: ${att.date}`);
        console.log(`     Clock In: ${att.clock_in || 'NULL'}`);
        console.log(`     Clock Out: ${att.clock_out || 'NULL'}`);
        console.log(`     Status: ${att.status}`);
        console.log(`     Total Hours: ${att.total_hours || 0}`);
        console.log(`     Created: ${att.createdAt}`);
        console.log(`     Updated: ${att.updatedAt}`);
        console.log('');
      });
    }
    
    // Check for Feb 11, 2026 specifically
    console.log('🔍 CHECKING FEB 11, 2026:');
    const feb11Attendance = await Attendance.findOne({
      where: {
        employee_id: lorenceId,
        date: '2026-02-11'
      }
    });
    
    if (feb11Attendance) {
      console.log('   ✓ Found attendance record for Feb 11, 2026:');
      console.log(`     Clock In: ${feb11Attendance.clock_in || 'NULL'}`);
      console.log(`     Clock Out: ${feb11Attendance.clock_out || 'NULL'}`);
      console.log(`     Status: ${feb11Attendance.status}`);
      console.log(`     Created: ${feb11Attendance.createdAt}`);
      console.log(`     Updated: ${feb11Attendance.updatedAt}`);
      
      // Check if this was created by biometric app or web app
      const createdTime = new Date(feb11Attendance.createdAt);
      console.log(`\n   📅 Record created at: ${createdTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' })} (Philippines time)`);
      
      // Check if shift has ended
      const feb11Schedule = schedules.find(s => 
        s.schedule_dates && s.schedule_dates.includes('2026-02-11')
      );
      
      if (feb11Schedule) {
        console.log(`\n   📋 Schedule for Feb 11:`);
        console.log(`     Shift: ${feb11Schedule.shift_name}`);
        console.log(`     Time: ${feb11Schedule.start_time} - ${feb11Schedule.end_time}`);
        
        // Parse end time
        const endTimeParts = feb11Schedule.end_time.split(':');
        const endHour = parseInt(endTimeParts[0]);
        const endMinute = parseInt(endTimeParts[1]);
        
        const shiftEndTime = new Date('2026-02-11');
        shiftEndTime.setHours(endHour, endMinute, 0, 0);
        
        const shiftEndWithGrace = new Date(shiftEndTime.getTime() + 30 * 60 * 1000); // +30 min
        
        console.log(`\n   ⏰ Shift end time: ${shiftEndTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
        console.log(`   ⏰ Shift end + grace: ${shiftEndWithGrace.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
        console.log(`   ⏰ Current time: ${philippinesTime.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
        console.log(`\n   ⚠️ Has shift ended? ${philippinesTime >= shiftEndWithGrace ? 'YES' : 'NO'}`);
        console.log(`   ⚠️ Should be marked absent? ${philippinesTime >= shiftEndWithGrace ? 'YES' : 'NO - TOO EARLY!'}`);
      } else {
        console.log(`\n   ⚠️ No schedule found for Feb 11, 2026`);
      }
    } else {
      console.log('   ❌ No attendance record for Feb 11, 2026\n');
    }
    
    console.log('========================================');
    console.log('🔍 END CHECK');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
};

checkLorenceAbsent();
