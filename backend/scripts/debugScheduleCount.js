import sequelize from '../config/database.js';

async function debugScheduleCount() {
  try {
    console.log('🔍 Debugging schedule count discrepancy...');
    
    // Get today's information
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const today = dayNames[now.getDay()];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log(`📅 Today is: ${today} (${todayDate})`);
    
    // 1. Check employee_schedules table directly
    console.log('\n1️⃣ EMPLOYEE_SCHEDULES TABLE:');
    const [employeeSchedules] = await sequelize.query(`
      SELECT id, employee_id, template_id, days, schedule_dates
      FROM employee_schedules 
      WHERE JSON_CONTAINS(days, '"${today}"')
      ORDER BY createdAt DESC
    `);
    console.log(`Employee schedules for ${today}: ${employeeSchedules.length}`);
    employeeSchedules.forEach(schedule => {
      console.log(`  - Employee ${schedule.employee_id}: Template ${schedule.template_id}`);
    });
    
    // 2. Check schedule_templates with assigned employees
    console.log('\n2️⃣ SCHEDULE_TEMPLATES WITH ASSIGNMENTS:');
    const [templatesWithAssignments] = await sequelize.query(`
      SELECT id, shift_name, department, specific_date, days, assigned_employees
      FROM schedule_templates 
      WHERE status = 'Active' 
      AND assigned_employees IS NOT NULL
      ORDER BY createdAt DESC
    `);
    
    console.log(`Active templates with assignments: ${templatesWithAssignments.length}`);
    
    let totalTemplateSchedules = 0;
    let todayTemplateSchedules = 0;
    
    templatesWithAssignments.forEach(template => {
      let assignedEmployees = [];
      try {
        assignedEmployees = JSON.parse(template.assigned_employees);
      } catch (e) {
        console.error(`Error parsing assigned_employees for template ${template.id}:`, e);
        return;
      }
      
      totalTemplateSchedules += assignedEmployees.length;
      
      // Check if this template applies to today
      let appliesToday = false;
      
      // Check specific_date
      if (template.specific_date === todayDate) {
        appliesToday = true;
      }
      // Check days array
      else if (template.days) {
        try {
          const days = JSON.parse(template.days);
          if (Array.isArray(days) && days.includes(today)) {
            appliesToday = true;
          }
        } catch (e) {
          // If days is already a string, check directly
          if (template.days.includes(today)) {
            appliesToday = true;
          }
        }
      }
      
      if (appliesToday) {
        todayTemplateSchedules += assignedEmployees.length;
        console.log(`  - Template ${template.id}: ${template.shift_name} (${template.department})`);
        console.log(`    Specific date: ${template.specific_date}`);
        console.log(`    Days: ${template.days}`);
        console.log(`    Assigned employees (${assignedEmployees.length}):`, assignedEmployees.map(emp => emp.employee_id));
      }
    });
    
    console.log(`\nTotal template-based schedules: ${totalTemplateSchedules}`);
    console.log(`Template-based schedules for ${today}: ${todayTemplateSchedules}`);
    
    // 3. Calculate what AdminMetrics would show
    console.log('\n3️⃣ ADMINMETRICS CALCULATION:');
    const totalScheduledToday = employeeSchedules.length + todayTemplateSchedules;
    console.log(`Total scheduled for ${today}: ${employeeSchedules.length} (legacy) + ${todayTemplateSchedules} (templates) = ${totalScheduledToday}`);
    
    // 4. Get unique employee IDs
    console.log('\n4️⃣ UNIQUE EMPLOYEES:');
    const uniqueEmployeeIds = new Set();
    
    // Add from employee_schedules
    employeeSchedules.forEach(schedule => {
      uniqueEmployeeIds.add(schedule.employee_id);
    });
    
    // Add from templates
    templatesWithAssignments.forEach(template => {
      let assignedEmployees = [];
      try {
        assignedEmployees = JSON.parse(template.assigned_employees);
      } catch (e) {
        return;
      }
      
      // Check if template applies to today
      let appliesToday = false;
      if (template.specific_date === todayDate) {
        appliesToday = true;
      } else if (template.days) {
        try {
          const days = JSON.parse(template.days);
          if (Array.isArray(days) && days.includes(today)) {
            appliesToday = true;
          }
        } catch (e) {
          if (template.days.includes(today)) {
            appliesToday = true;
          }
        }
      }
      
      if (appliesToday) {
        assignedEmployees.forEach(emp => {
          uniqueEmployeeIds.add(emp.employee_id);
        });
      }
    });
    
    console.log(`Unique employees scheduled for ${today}: ${uniqueEmployeeIds.size}`);
    console.log('Employee IDs:', Array.from(uniqueEmployeeIds));
    
    await sequelize.close();
    console.log('\n✅ Debug completed');
  } catch (error) {
    console.error('❌ Error debugging schedule count:', error);
    await sequelize.close();
    process.exit(1);
  }
}

debugScheduleCount();