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

async function checkStructure() {
  try {
    const [columns] = await sequelize.query(`
      DESCRIBE employee_schedules
    `);
    
    console.log('📋 employee_schedules table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

checkStructure();
