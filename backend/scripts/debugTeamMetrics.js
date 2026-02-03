import { getAllEmployeeSchedules } from "../services/employeeScheduleService.js";
import { getEmployeeSchedulesFromTemplates } from "../services/scheduleTemplateService.js";
import Employee from "../models/employee.js";

const debugTeamMetrics = async () => {
  try {
    console.log('🔍 Debugging Team Metrics...');
    
    // Get today's date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log('📅 Today\'s date:', todayDate);
    
    // Get all employees
    const employees = await Employee.findAll({
      where: { status: 'Active' }
    });
    
    console.log('👥 Total active employees:', employees.length);
    
    // Group by department
    const departmentCounts = {};
    employees.forEach(emp => {
      departmentCounts[emp.department] = (departmentCounts[emp.department] || 0) + 1;
    });
    
    console.log('🏢 Employees by department:', departmentCounts);
    
    // Get schedules from both systems
    const legacySchedules = await getAllEmployeeSchedules();
    const templateSchedules = await getEmployeeSchedulesFromTemplates();
    
    console.log('📋 Legacy schedules:', legacySchedules.length);
    console.log('📋 Template schedules:', templateSchedules.length);
    
    // Combine schedules
    const allSchedules = [...legacySchedules, ...templateSchedules];
    console.log('📋 Total schedules:', allSchedules.length);
    
    // Check schedules for today
    const todaySchedules = allSchedules.filter(schedule => {
      if (schedule.specific_date) {
        return schedule.specific_date === todayDate;
      }
      return false;
    });
    
    console.log('📅 Schedules for today:', todaySchedules.length);
    
    // Group today's schedules by department
    const todayByDepartment = {};
    todaySchedules.forEach(schedule => {
      const dept = schedule.department || 'Unknown';
      if (!todayByDepartment[dept]) {
        todayByDepartment[dept] = [];
      }
      todayByDepartment[dept].push({
        employee_id: schedule.employee_id,
        shift_name: schedule.shift_name,
        start_time: schedule.start_time,
        end_time: schedule.end_time
      });
    });
    
    console.log('🏢 Today\'s schedules by department:');
    Object.keys(todayByDepartment).forEach(dept => {
      console.log(`  ${dept}: ${todayByDepartment[dept].length} employees`);
      todayByDepartment[dept].forEach(schedule => {
        console.log(`    - ${schedule.employee_id}: ${schedule.shift_name} (${schedule.start_time}-${schedule.end_time})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error debugging team metrics:', error);
  }
};

debugTeamMetrics();