import sequelize from '../config/database.js';
import Employee from '../models/employee.js';

async function checkTeamLeaderStatus() {
  try {
    console.log('🔍 Checking team leader status for all zones...\n');
    
    const zones = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
    
    for (const zone of zones) {
      const teamLeader = await Employee.findOne({
        where: {
          department: zone,
          position: 'Team Leader',
          status: 'Active'
        }
      });
      
      if (teamLeader) {
        console.log(`✅ ${zone}: ${teamLeader.firstname} ${teamLeader.lastname} (ID: ${teamLeader.employee_id})`);
        console.log(`   Biometric: ${teamLeader.has_fingerprint ? '✅ Enrolled' : '❌ Not enrolled'}`);
      } else {
        console.log(`❌ ${zone}: No team leader assigned`);
      }
      console.log('');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTeamLeaderStatus();