import sequelize from '../config/database.js';

async function checkTableStructure() {
  try {
    console.log('🔍 Checking database table structure...');
    
    // Show all tables
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]));
    
    // Check schedule_templates structure
    try {
      const [scheduleTemplateColumns] = await sequelize.query("DESCRIBE schedule_templates");
      console.log('\n📊 schedule_templates columns:');
      scheduleTemplateColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (e) {
      console.log('❌ schedule_templates table not found');
    }
    
    // Check employee_schedules structure
    try {
      const [employeeScheduleColumns] = await sequelize.query("DESCRIBE employee_schedules");
      console.log('\n👥 employee_schedules columns:');
      employeeScheduleColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (e) {
      console.log('❌ employee_schedules table not found');
    }
    
    // Check for any schedule-related data
    try {
      const [scheduleCount] = await sequelize.query("SELECT COUNT(*) as count FROM schedule_templates");
      console.log(`\n📈 Total schedule templates: ${scheduleCount[0].count}`);
    } catch (e) {
      console.log('❌ Could not count schedule_templates');
    }
    
    try {
      const [employeeScheduleCount] = await sequelize.query("SELECT COUNT(*) as count FROM employee_schedules");
      console.log(`📈 Total employee schedules: ${employeeScheduleCount[0].count}`);
    } catch (e) {
      console.log('❌ Could not count employee_schedules');
    }
    
    await sequelize.close();
    console.log('✅ Table structure check completed');
  } catch (error) {
    console.error('❌ Error checking table structure:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkTableStructure();