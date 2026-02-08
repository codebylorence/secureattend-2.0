import Attendance from '../models/attendance.js';

async function checkStatus() {
  try {
    console.log('🔍 Checking attendance status in database...\n');
    
    const employeeIds = ['TSI00003', 'TSI00004', 'TSI00005', 'TSI00006'];
    
    for (const empId of employeeIds) {
      const attendance = await Attendance.findOne({
        where: {
          employee_id: empId,
          date: '2026-02-07'
        }
      });
      
      if (attendance) {
        console.log(`${empId}:`);
        console.log(`  Status: ${attendance.status}`);
        console.log(`  Clock In: ${attendance.clock_in}`);
        console.log(`  Clock Out: ${attendance.clock_out}`);
        console.log(`  Updated At: ${attendance.updatedAt}`);
        console.log('');
      } else {
        console.log(`${empId}: No record found\n`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStatus();
