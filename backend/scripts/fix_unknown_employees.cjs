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

async function fixUnknownEmployees() {
  try {
    console.log('🔍 Checking for attendance records with numeric employee_id...\n');

    // Check attendance records with numeric employee_id
    const [numericRecords] = await sequelize.query(`
      SELECT a.*, e.employee_id as correct_employee_id, e.firstname, e.lastname
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.employee_id REGEXP '^[0-9]+$'
      ORDER BY a.date DESC
    `);

    console.log(`Found ${numericRecords.length} records with numeric employee_id`);

    if (numericRecords.length === 0) {
      console.log('✅ No records to fix!');
      await sequelize.close();
      return;
    }

    console.log('\n📋 Records to fix:');
    numericRecords.forEach(r => {
      console.log(`  - ID ${r.id}: employee_id=${r.employee_id} (numeric) -> should be ${r.correct_employee_id} (${r.firstname} ${r.lastname})`);
    });

    console.log('\n🔄 Fixing records...');

    for (const record of numericRecords) {
      if (record.correct_employee_id) {
        await sequelize.query(`
          UPDATE attendances
          SET employee_id = ?
          WHERE id = ?
        `, { replacements: [record.correct_employee_id, record.id] });

        console.log(`  ✅ Fixed record ${record.id}: ${record.employee_id} -> ${record.correct_employee_id}`);
      } else {
        console.log(`  ⚠️ Could not find correct employee_id for record ${record.id} (numeric id: ${record.employee_id})`);
      }
    }

    // Verify the fix
    console.log('\n📊 Verification:');
    const [stillNumeric] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM attendances
      WHERE employee_id REGEXP '^[0-9]+$'
    `);

    console.log(`Remaining numeric employee_id records: ${stillNumeric[0].count}`);

    // Show Feb 5 records
    console.log('\n📅 Feb 5 attendance records after fix:');
    const [feb5Records] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE DATE(a.date) = '2026-02-05'
      ORDER BY a.employee_id
    `);

    feb5Records.forEach(r => {
      console.log(`  - ${r.firstname} ${r.lastname} (${r.employee_id}): ${r.status}`);
    });

    await sequelize.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
  }
}

fixUnknownEmployees();
