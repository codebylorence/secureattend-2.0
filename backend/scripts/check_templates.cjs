const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'rence652',
  database: 'secureattend_db',
  logging: false
});

async function checkTemplates() {
  try {
    console.log('🔍 Checking schedule templates...\n');

    // Check schedule templates
    const [templates] = await sequelize.query(`
      SELECT * FROM schedule_templates
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log(`Found ${templates.length} schedule templates:`);
    templates.forEach(t => {
      console.log(`\nTemplate ID: ${t.id}`);
      console.log(`  Shift: ${t.shift_name} (${t.start_time} - ${t.end_time})`);
      console.log(`  Days: ${t.days}`);
      console.log(`  Specific Date: ${t.specific_date}`);
      console.log(`  Assigned Employees: ${t.assigned_employees}`);
      console.log(`  Created: ${t.created_at}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

checkTemplates();
