import sequelize from '../config/database.js';

async function investigateEmployeeSchedules() {
  try {
    console.log('🔍 Investigating employee schedules for 034 and TSI00123...');
    
    // Get detailed information about these specific schedules
    const [scheduleDetails] = await sequelize.query(`
      SELECT 
        es.id,
        es.employee_id,
        es.template_id,
        es.days,
        es.schedule_dates,
        es.start_date,
        es.end_date,
        es.assigned_by,
        es.status,
        es.createdAt,
        es.updatedAt,
        st.shift_name,
        st.start_time,
        st.end_time,
        st.department,
        st.status as template_status,
        st.createdAt as template_created
      FROM employee_schedules es
      LEFT JOIN schedule_templates st ON es.template_id = st.id
      WHERE es.employee_id IN ('034', 'TSI00123')
      ORDER BY es.createdAt DESC
    `);
    
    console.log(`\n📋 Found ${scheduleDetails.length} schedule records:`);
    
    scheduleDetails.forEach(schedule => {
      console.log(`\n👤 Employee: ${schedule.employee_id}`);
      console.log(`📅 Schedule ID: ${schedule.id}`);
      console.log(`🏷️ Template ID: ${schedule.template_id}`);
      console.log(`📊 Status: ${schedule.status}`);
      console.log(`📆 Days: ${schedule.days}`);
      console.log(`🗓️ Schedule Dates: ${schedule.schedule_dates}`);
      console.log(`📅 Start Date: ${schedule.start_date}`);
      console.log(`📅 End Date: ${schedule.end_date}`);
      console.log(`👨‍💼 Assigned By: ${schedule.assigned_by}`);
      console.log(`⏰ Created: ${schedule.createdAt}`);
      console.log(`⏰ Updated: ${schedule.updatedAt}`);
      
      if (schedule.shift_name) {
        console.log(`\n🔗 Template Details:`);
        console.log(`  Shift: ${schedule.shift_name}`);
        console.log(`  Time: ${schedule.start_time} - ${schedule.end_time}`);
        console.log(`  Department: ${schedule.department}`);
        console.log(`  Template Status: ${schedule.template_status}`);
        console.log(`  Template Created: ${schedule.template_created}`);
      } else {
        console.log(`\n⚠️ Template not found or deleted (ID: ${schedule.template_id})`);
      }
      
      console.log('─'.repeat(50));
    });
    
    // Check if these employees exist and are active
    console.log('\n👥 Employee Information:');
    const [employees] = await sequelize.query(`
      SELECT employee_id, fullname, department, position, status, createdAt
      FROM employees 
      WHERE employee_id IN ('034', 'TSI00123')
    `);
    
    employees.forEach(emp => {
      console.log(`\n👤 ${emp.employee_id}: ${emp.fullname}`);
      console.log(`  Department: ${emp.department}`);
      console.log(`  Position: ${emp.position}`);
      console.log(`  Status: ${emp.status}`);
      console.log(`  Created: ${emp.createdAt}`);
    });
    
    // Check recent schedule assignments or modifications
    console.log('\n📝 Recent Schedule Activity:');
    const [recentActivity] = await sequelize.query(`
      SELECT 
        es.employee_id,
        es.assigned_by,
        es.createdAt,
        es.updatedAt,
        st.shift_name
      FROM employee_schedules es
      LEFT JOIN schedule_templates st ON es.template_id = st.id
      WHERE es.employee_id IN ('034', 'TSI00123')
      ORDER BY es.updatedAt DESC
    `);
    
    recentActivity.forEach(activity => {
      console.log(`📅 ${activity.employee_id}: ${activity.shift_name || 'Unknown Shift'}`);
      console.log(`  Assigned by: ${activity.assigned_by}`);
      console.log(`  Created: ${activity.createdAt}`);
      console.log(`  Last updated: ${activity.updatedAt}`);
    });
    
    await sequelize.close();
    console.log('\n✅ Investigation completed');
  } catch (error) {
    console.error('❌ Error investigating schedules:', error);
    await sequelize.close();
    process.exit(1);
  }
}

investigateEmployeeSchedules();