import User from '../models/user.js';
import Employee from '../models/employee.js';
import ScheduleTemplate from '../models/scheduleTemplate.js';
import '../models/associations.js';

async function testTeamLeaderScheduling() {
  try {
    console.log('🔍 Testing Team Leader Scheduling Setup\n');
    
    // 1. Find all team leaders
    console.log('1️⃣ Finding team leaders...');
    const teamLeaders = await User.findAll({
      where: { role: 'teamleader' },
      include: [{
        model: Employee,
        as: 'employee'
      }]
    });
    
    console.log(`   Found ${teamLeaders.length} team leaders:`);
    teamLeaders.forEach(tl => {
      console.log(`   - ${tl.employee.firstname} ${tl.employee.lastname} (${tl.employee.employee_id})`);
      console.log(`     Department: ${tl.employee.department}`);
      console.log(`     Role: ${tl.role}`);
    });
    
    if (teamLeaders.length === 0) {
      console.log('   ❌ No team leaders found!');
      return;
    }
    
    // 2. For each team leader, find their team members
    console.log('\n2️⃣ Finding team members for each team leader...');
    for (const teamLeader of teamLeaders) {
      const department = teamLeader.employee.department;
      console.log(`\n   Team Leader: ${teamLeader.employee.firstname} ${teamLeader.employee.lastname}`);
      console.log(`   Department: ${department}`);
      
      const teamMembers = await Employee.findAll({
        where: {
          department: department,
          status: 'Active'
        }
      });
      
      console.log(`   Found ${teamMembers.length} employees in ${department}:`);
      teamMembers.forEach(member => {
        const isTeamLeader = member.employee_id === teamLeader.employee.employee_id;
        console.log(`   ${isTeamLeader ? '👑' : '  '} ${member.firstname} ${member.lastname} (${member.employee_id}) - ${member.position}`);
      });
      
      const nonLeaderMembers = teamMembers.filter(m => m.employee_id !== teamLeader.employee.employee_id);
      console.log(`   Team members (excluding leader): ${nonLeaderMembers.length}`);
    }
    
    // 3. Check templates for team leader departments
    console.log('\n3️⃣ Checking templates for team leader departments...');
    for (const teamLeader of teamLeaders) {
      const department = teamLeader.employee.department;
      
      const templates = await ScheduleTemplate.findAll({
        where: {
          department: department,
          status: 'Active'
        }
      });
      
      console.log(`\n   Department: ${department}`);
      console.log(`   Found ${templates.length} active templates:`);
      templates.forEach(template => {
        console.log(`   - ${template.shift_name} (${template.start_time} - ${template.end_time})`);
        console.log(`     Date: ${template.specific_date || 'Recurring'}`);
        console.log(`     Assigned employees: ${template.assigned_employees ? JSON.parse(template.assigned_employees).length : 0}`);
      });
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testTeamLeaderScheduling();
