import { getAllEmployeeSchedules } from "../services/employeeScheduleService.js";
import { getEmployeeSchedulesFromTemplates } from "../services/scheduleTemplateService.js";

const testTeamMetricsAPI = async () => {
  try {
    console.log('🧪 Testing Team Metrics API...');
    
    // Simulate the same API calls that TeamMetrics makes
    const legacySchedules = await getAllEmployeeSchedules();
    const templateSchedules = await getEmployeeSchedulesFromTemplates();
    const allSchedules = [...legacySchedules, ...templateSchedules];
    
    console.log('📊 API Results:');
    console.log('  Legacy schedules:', legacySchedules.length);
    console.log('  Template schedules:', templateSchedules.length);
    console.log('  Total schedules:', allSchedules.length);
    
    // Get today's date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log('📅 Today:', todayDate);
    
    // Filter for Zone A department (like TeamMetrics would do)
    const zoneASchedules = allSchedules.filter(schedule => {
      // Check if scheduled for today
      if (schedule.specific_date && schedule.specific_date === todayDate) {
        return schedule.department === 'Zone A';
      }
      return false;
    });
    
    console.log('🏢 Zone A schedules for today:', zoneASchedules.length);
    zoneASchedules.forEach(schedule => {
      console.log(`  - Employee ${schedule.employee_id}: ${schedule.shift_name} (${schedule.start_time}-${schedule.end_time})`);
    });
    
    // Test the exact logic from TeamMetrics
    const scheduledEmployeeIds = new Set();
    
    allSchedules.forEach((schedule, index) => {
      // Only process Zone A employees (simulate department filtering)
      if (schedule.department !== 'Zone A') return;
      
      if (schedule.specific_date) {
        if (schedule.specific_date === todayDate) {
          console.log(`✅ Adding Zone A employee ${schedule.employee_id} (specific_date match)`);
          scheduledEmployeeIds.add(schedule.employee_id);
        }
      }
    });
    
    console.log('📈 Final Zone A scheduled count:', scheduledEmployeeIds.size);
    console.log('👥 Zone A scheduled employees:', Array.from(scheduledEmployeeIds));
    
  } catch (error) {
    console.error('❌ Error testing Team Metrics API:', error);
  }
};

testTeamMetricsAPI();