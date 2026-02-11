import sequelize from '../config/database.js';
import Attendance from '../models/attendance.js';
import Employee from '../models/employee.js';
import '../models/associations.js';
import { getCurrentDateInTimezone } from '../utils/timezone.js';

async function checkAttendanceIssue() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const today = getCurrentDateInTimezone();
    console.log(`\n📅 Checking attendance for date: ${today}`);

    // Find James Tojon
    const james = await Employee.findOne({
      where: { 
        firstname: 'James',
        lastname: 'Tojon'
      }
    });

    // Find Lorence Rodriguez
    const lorence = await Employee.findOne({
      where: { 
        firstname: 'Lorence',
        lastname: 'Rodriguez'
      }
    });

    if (!james) {
      console.log('❌ James Tojon not found in database');
    } else {
      console.log(`\n👤 James Tojon: ${james.employee_id}`);
      
      const jamesAttendance = await Attendance.findAll({
        where: {
          employee_id: james.employee_id,
          date: today
        },
        order: [['createdAt', 'DESC']]
      });

      if (jamesAttendance.length === 0) {
        console.log('  ❌ No attendance record for today');
      } else {
        console.log(`  📊 Found ${jamesAttendance.length} attendance record(s):`);
        jamesAttendance.forEach((att, index) => {
          console.log(`\n  Record ${index + 1}:`);
          console.log(`    - ID: ${att.id}`);
          console.log(`    - Date: ${att.date}`);
          console.log(`    - Clock In: ${att.clock_in || 'NULL'}`);
          console.log(`    - Clock Out: ${att.clock_out || 'NULL'}`);
          console.log(`    - Status: ${att.status}`);
          console.log(`    - Total Hours: ${att.total_hours || 'NULL'}`);
          console.log(`    - Created: ${att.createdAt}`);
          console.log(`    - Updated: ${att.updatedAt}`);
        });

        // Check if should be "Missed Clock-out"
        const latestRecord = jamesAttendance[0];
        if (latestRecord.clock_in && !latestRecord.clock_out) {
          const clockInTime = new Date(latestRecord.clock_in);
          const now = new Date();
          const hoursSinceClockIn = (now - clockInTime) / (1000 * 60 * 60);
          
          console.log(`\n  ⏰ Analysis:`);
          console.log(`    - Hours since clock-in: ${hoursSinceClockIn.toFixed(2)}`);
          console.log(`    - Current status: ${latestRecord.status}`);
          
          if (hoursSinceClockIn > 12 && latestRecord.status !== 'Missed Clock-out') {
            console.log(`    - ⚠️ SHOULD BE: Missed Clock-out (clocked in ${hoursSinceClockIn.toFixed(2)} hours ago)`);
          } else if (latestRecord.status === 'Missed Clock-out') {
            console.log(`    - ✅ Correctly marked as Missed Clock-out`);
          } else {
            console.log(`    - ℹ️ Still within normal shift hours`);
          }
        }
      }
    }

    if (!lorence) {
      console.log('\n❌ Lorence Rodriguez not found in database');
    } else {
      console.log(`\n\n👤 Lorence Rodriguez: ${lorence.employee_id}`);
      
      const lorenceAttendance = await Attendance.findAll({
        where: {
          employee_id: lorence.employee_id,
          date: today
        },
        order: [['createdAt', 'DESC']]
      });

      if (lorenceAttendance.length === 0) {
        console.log('  ❌ No attendance record for today - SHOULD BE MARKED ABSENT');
      } else {
        console.log(`  📊 Found ${lorenceAttendance.length} attendance record(s):`);
        lorenceAttendance.forEach((att, index) => {
          console.log(`\n  Record ${index + 1}:`);
          console.log(`    - ID: ${att.id}`);
          console.log(`    - Date: ${att.date}`);
          console.log(`    - Clock In: ${att.clock_in || 'NULL'}`);
          console.log(`    - Clock Out: ${att.clock_out || 'NULL'}`);
          console.log(`    - Status: ${att.status}`);
          console.log(`    - Total Hours: ${att.total_hours || 'NULL'}`);
          console.log(`    - Created: ${att.createdAt}`);
          console.log(`    - Updated: ${att.updatedAt}`);
        });

        // Check if should be "Absent"
        const latestRecord = lorenceAttendance[0];
        if (latestRecord.status !== 'Absent' && !latestRecord.clock_in) {
          console.log(`\n  ⚠️ ISSUE: Status is "${latestRecord.status}" but no clock_in - should be Absent`);
        } else if (latestRecord.status === 'Absent') {
          console.log(`\n  ✅ Correctly marked as Absent`);
        }
      }
    }

    // Check all today's attendance records
    console.log(`\n\n📊 All attendance records for ${today}:`);
    const allToday = await Attendance.findAll({
      where: { date: today },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'firstname', 'lastname']
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`\nTotal records: ${allToday.length}\n`);
    allToday.forEach(att => {
      const name = att.employee?.firstname && att.employee?.lastname 
        ? `${att.employee.firstname} ${att.employee.lastname}` 
        : att.employee_id;
      console.log(`${name} (${att.employee_id}): ${att.status} | In: ${att.clock_in ? new Date(att.clock_in).toLocaleTimeString() : 'NULL'} | Out: ${att.clock_out ? new Date(att.clock_out).toLocaleTimeString() : 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkAttendanceIssue();
