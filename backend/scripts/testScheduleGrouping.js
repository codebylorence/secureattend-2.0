import { getAllEmployeeSchedules, assignScheduleToEmployee } from '../services/employeeScheduleService.js';
import '../models/index.js';

async function testScheduleGrouping() {
  console.log('🧪 Testing schedule grouping...\n');
  
  try {
    // Create test schedules for the same shift/date/department
    console.log('📝 Creating test schedules...');
    
    const testSchedule1 = await assignScheduleToEmployee({
      employee_id: 'TSI00001',
      shift_name: 'Morning Shift',
      start_time: '08:00',
      end_time: '17:00',
      department: 'Warehouse',
      days: ['Monday', 'Tuesday'],
      start_date: '2026-02-10',
      assigned_by: 'admin'
    });
    console.log('✅ Created schedule 1:', testSchedule1.id);
    
    const testSchedule2 = await assignScheduleToEmployee({
      employee_id: 'TSI00003',
      shift_name: 'Morning Shift',
      start_time: '08:00',
      end_time: '17:00',
      department: 'Warehouse',
      days: ['Monday', 'Tuesday'],
      start_date: '2026-02-10',
      assigned_by: 'admin'
    });
    console.log('✅ Created schedule 2:', testSchedule2.id);
    
    // Fetch grouped schedules
    console.log('\n📊 Fetching grouped schedules...');
    const groupedSchedules = await getAllEmployeeSchedules();
    
    console.log('\n📋 Results:');
    console.log(`Total groups: ${groupedSchedules.length}`);
    
    groupedSchedules.forEach((group, index) => {
      console.log(`\nGroup ${index + 1}:`);
      console.log(`  Shift: ${group.shift_name}`);
      console.log(`  Date: ${group.specific_date}`);
      console.log(`  Department: ${group.department}`);
      console.log(`  Time: ${group.start_time} - ${group.end_time}`);
      console.log(`  Assigned Employees: ${group.assigned_employees.length}`);
      group.assigned_employees.forEach(emp => {
        console.log(`    - ${emp.employee_id} (Schedule ID: ${emp.schedule_id})`);
      });
    });
    
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

testScheduleGrouping();
