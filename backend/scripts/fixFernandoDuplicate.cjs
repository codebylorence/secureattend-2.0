const { Attendance } = require('../models');
const { Op } = require('sequelize');

async function fixFernandoDuplicate() {
  try {
    console.log('🔍 Checking for Fernando duplicate attendance records...');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log(`📅 Today's date: ${todayDate}`);
    
    // Find all Fernando's attendance records for today
    const fernandoRecords = await Attendance.findAll({
      where: {
        employee_id: 'TSI00001',
        date: todayDate
      },
      order: [['createdAt', 'ASC']]
    });
    
    console.log(`\n📊 Found ${fernandoRecords.length} attendance records for Fernando (TSI00001) on ${todayDate}:`);
    
    fernandoRecords.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log(`  ID: ${record.id}`);
      console.log(`  Employee ID: ${record.employee_id}`);
      console.log(`  Date: ${record.date}`);
      console.log(`  Clock In: ${record.clock_in || 'N/A'}`);
      console.log(`  Clock Out: ${record.clock_out || 'N/A'}`);
      console.log(`  Status: ${record.status}`);
      console.log(`  Created At: ${record.createdAt}`);
      console.log(`  Updated At: ${record.updatedAt}`);
    });
    
    if (fernandoRecords.length > 1) {
      console.log('\n⚠️  Multiple records found! Analyzing...');
      
      // Find the "Absent" record (should be deleted if there's a Present/Late record)
      const absentRecord = fernandoRecords.find(r => r.status === 'Absent');
      const presentRecord = fernandoRecords.find(r => r.status === 'Present' || r.status === 'Late');
      
      if (absentRecord && presentRecord) {
        console.log('\n🔧 Found both Absent and Present/Late records.');
        console.log(`   Absent record ID: ${absentRecord.id}`);
        console.log(`   Present record ID: ${presentRecord.id}`);
        console.log('\n❌ Deleting the Absent record (employee actually clocked in)...');
        
        await absentRecord.destroy();
        console.log('✅ Absent record deleted successfully!');
        
        // Verify
        const remainingRecords = await Attendance.findAll({
          where: {
            employee_id: 'TSI00001',
            date: todayDate
          }
        });
        
        console.log(`\n✅ Verification: ${remainingRecords.length} record(s) remaining for Fernando`);
        remainingRecords.forEach(record => {
          console.log(`   - Status: ${record.status}, Clock In: ${record.clock_in || 'N/A'}`);
        });
      } else {
        console.log('\n⚠️  Could not determine which record to delete. Manual review needed.');
      }
    } else if (fernandoRecords.length === 1) {
      console.log('\n✅ Only one record found - no duplicates!');
    } else {
      console.log('\n⚠️  No records found for Fernando today.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixFernandoDuplicate();
