const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function checkTemplates() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check schedule templates
    const [templates] = await sequelize.query(`
      SELECT 
        id,
        shift_name,
        start_time,
        end_time,
        days,
        specific_date,
        assigned_employees,
        status,
        created_by
      FROM schedule_templates
      ORDER BY id
    `);

    console.log(`📊 Total schedule templates: ${templates.length}\n`);
    
    if (templates.length > 0) {
      console.log('📋 Schedule Templates:');
      templates.forEach(t => {
        console.log(`\n  ID: ${t.id}`);
        console.log(`  Shift: ${t.shift_name} (${t.start_time} - ${t.end_time})`);
        console.log(`  Days: ${JSON.stringify(t.days)}`);
        console.log(`  Specific Date: ${t.specific_date || 'N/A'}`);
        console.log(`  Assigned Employees: ${JSON.stringify(t.assigned_employees)}`);
        console.log(`  Status: ${t.status}`);
        console.log(`  Created By: ${t.created_by}`);
      });
      
      console.log('\n\n💡 Templates exist but NO employee_schedules records!');
      console.log('   This means templates were created but employees were NOT assigned to them.');
      console.log('   You need to assign employees to these templates in the admin panel.');
    } else {
      console.log('⚠️ NO TEMPLATES FOUND!');
      console.log('\n💡 You need to:');
      console.log('   1. Go to the admin panel');
      console.log('   2. Create schedule templates');
      console.log('   3. Assign employees to those templates');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

checkTemplates();
