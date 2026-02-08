import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";

async function checkAbsentRecords() {
  try {
    console.log('📂 Checking backend database for absent records...\n');

    // Check for absent records
    const absentRecords = await Attendance.findAll({
      where: { status: "Absent" },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'firstname', 'lastname'],
        required: false
      }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: 20
    });

    console.log(`📊 Found ${absentRecords.length} absent records in backend:\n`);
    
    if (absentRecords.length === 0) {
      console.log('  ❌ No absent records found in backend database!');
      console.log('  This means the sync from biometric app to backend is failing.\n');
    } else {
      absentRecords.forEach(record => {
        const employeeName = record.employee 
          ? `${record.employee.firstname} ${record.employee.lastname}` 
          : 'Unknown';
        console.log(`  ID: ${record.id}`);
        console.log(`  Employee: ${record.employee_id} (${employeeName})`);
        console.log(`  Date: ${record.date}`);
        console.log(`  Clock In: ${record.clock_in || '(null)'}`);
        console.log(`  Clock Out: ${record.clock_out || '(null)'}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Created: ${record.createdAt}`);
        console.log(`  ---`);
      });
    }

    // Check all records for today
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = await Attendance.findAll({
      where: { date: today },
      order: [['createdAt', 'DESC']]
    });

    console.log(`\n📅 All attendance records for today (${today}):\n`);
    if (todayRecords.length === 0) {
      console.log('  ℹ️ No attendance records for today');
    } else {
      todayRecords.forEach(record => {
        console.log(`  ${record.employee_id}: ${record.status} (clock_in: ${record.clock_in || 'null'})`);
      });
    }

    // Check yesterday's records
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    const yesterdayRecords = await Attendance.findAll({
      where: { date: yesterdayDate },
      order: [['createdAt', 'DESC']]
    });

    console.log(`\n📅 All attendance records for yesterday (${yesterdayDate}):\n`);
    if (yesterdayRecords.length === 0) {
      console.log('  ℹ️ No attendance records for yesterday');
    } else {
      yesterdayRecords.forEach(record => {
        console.log(`  ${record.employee_id}: ${record.status} (clock_in: ${record.clock_in || 'null'})`);
      });
    }

    console.log('\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAbsentRecords();
