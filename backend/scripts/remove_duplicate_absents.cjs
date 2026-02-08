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

async function removeDuplicates() {
  try {
    console.log('🔍 Checking for duplicate absent records...\n');

    // Find duplicates for Feb 5
    const [duplicates] = await sequelize.query(`
      SELECT employee_id, DATE(date) as date_only, COUNT(*) as count
      FROM attendances
      WHERE DATE(date) = '2026-02-05' AND status = 'Absent'
      GROUP BY employee_id, DATE(date)
      HAVING COUNT(*) > 1
    `);

    console.log(`Found ${duplicates.length} employees with duplicate absent records`);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates to remove!');
      await sequelize.close();
      return;
    }

    for (const dup of duplicates) {
      console.log(`\n👤 ${dup.employee_id} has ${dup.count} absent records for ${dup.date_only}`);

      // Get all records for this employee on this date
      const [records] = await sequelize.query(`
        SELECT * FROM attendances
        WHERE employee_id = ? AND DATE(date) = ? AND status = 'Absent'
        ORDER BY id ASC
      `, { replacements: [dup.employee_id, dup.date_only] });

      // Keep the first record, delete the rest
      const keepId = records[0].id;
      const deleteIds = records.slice(1).map(r => r.id);

      console.log(`  Keeping record ID: ${keepId}`);
      console.log(`  Deleting record IDs: ${deleteIds.join(', ')}`);

      if (deleteIds.length > 0) {
        await sequelize.query(`
          DELETE FROM attendances
          WHERE id IN (${deleteIds.join(',')})
        `);

        console.log(`  ✅ Deleted ${deleteIds.length} duplicate records`);
      }
    }

    // Verify
    console.log('\n📊 Verification - Feb 5 attendance records:');
    const [feb5Records] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE DATE(a.date) = '2026-02-05'
      ORDER BY a.employee_id
    `);

    console.log(`Total records: ${feb5Records.length}`);
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

removeDuplicates();
