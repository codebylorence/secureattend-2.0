const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'secureattend'
    });
    
    console.log('✅ Connected to database');
    
    // Check if schedule_templates table exists
    const [tables] = await conn.query("SHOW TABLES LIKE 'schedule_templates'");
    
    if (tables.length > 0) {
      console.log('✅ schedule_templates table EXISTS');
      
      // Get table structure
      const [columns] = await conn.query("DESCRIBE schedule_templates");
      console.log('\n📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Count records
      const [count] = await conn.query("SELECT COUNT(*) as count FROM schedule_templates");
      console.log(`\n📊 Total records: ${count[0].count}`);
      
    } else {
      console.log('❌ schedule_templates table DOES NOT EXIST');
      console.log('⚠️  You will need to recreate this table!');
    }
    
    // Check employee_schedules table structure
    console.log('\n📋 Checking employee_schedules table...');
    const [empScheduleCols] = await conn.query("DESCRIBE employee_schedules");
    
    const hasDirectFields = empScheduleCols.some(col => 
      ['shift_name', 'start_time', 'end_time', 'department'].includes(col.Field)
    );
    
    if (hasDirectFields) {
      console.log('⚠️  employee_schedules has direct scheduling fields:');
      empScheduleCols.forEach(col => {
        if (['shift_name', 'start_time', 'end_time', 'department'].includes(col.Field)) {
          console.log(`  - ${col.Field}: ${col.Type}`);
        }
      });
      console.log('\n❌ These fields need to be removed to restore template system');
    } else {
      console.log('✅ employee_schedules does NOT have direct scheduling fields');
    }
    
    // Check template_id column
    const templateIdCol = empScheduleCols.find(col => col.Field === 'template_id');
    if (templateIdCol) {
      console.log(`\n📋 template_id column: ${templateIdCol.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      if (templateIdCol.Null === 'YES') {
        console.log('⚠️  template_id is nullable - needs to be NOT NULL for template system');
      }
    }
    
    await conn.end();
    console.log('\n✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
