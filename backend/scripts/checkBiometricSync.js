import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

async function checkBiometricSync() {
  try {
    console.log('🔍 Checking what records are in the backend database...\n');
    
    const today = '2026-02-07';
    
    // Check all attendance records for today
    const [attendances] = await sequelize.query(`
      SELECT a.*, e.firstname, e.lastname 
      FROM attendances a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.date = ?
      ORDER BY a.createdAt DESC
    `, {
      replacements: [today]
    });
    
    console.log(`📊 Attendance records in backend for ${today} (${attendances.length}):\n`);
    
    attendances.forEach(att => {
      console.log(`  ${att.employee_id} - ${att.firstname} ${att.lastname}`);
      console.log(`    Status: ${att.status}`);
      console.log(`    Clock In: ${att.clock_in || 'N/A'}`);
      console.log(`    Clock Out: ${att.clock_out || 'N/A'}`);
      console.log(`    Created: ${att.createdAt}`);
      console.log(`    Updated: ${att.updatedAt}`);
      console.log('');
    });
    
    // Check which employees are scheduled but don't have attendance
    const [scheduled] = await sequelize.query(`
      SELECT DISTINCT st.id, st.shift_name, st.start_time, st.end_time, st.assigned_employees
      FROM schedule_templates st
      WHERE st.specific_date = ?
    `, {
      replacements: [today]
    });
    
    console.log(`\n📋 Scheduled employees for ${today}:\n`);
    
    for (const template of scheduled) {
      let assignedEmployees = [];
      try {
        assignedEmployees = typeof template.assigned_employees === 'string' 
          ? JSON.parse(template.assigned_employees) 
          : template.assigned_employees || [];
      } catch (e) {
        console.log(`  ⚠️ Error parsing assigned_employees for template ${template.id}`);
      }
      
      console.log(`  Template ${template.id}: ${template.shift_name} (${template.start_time}-${template.end_time})`);
      console.log(`    Assigned: ${assignedEmployees.length} employees`);
      
      for (const assignment of assignedEmployees) {
        const hasAttendance = attendances.some(a => a.employee_id === assignment.employee_id);
        const [employee] = await sequelize.query(`
          SELECT firstname, lastname FROM employees WHERE employee_id = ?
        `, {
          replacements: [assignment.employee_id]
        });
        
        const name = employee[0] ? `${employee[0].firstname} ${employee[0].lastname}` : 'Unknown';
        console.log(`      ${assignment.employee_id} (${name}): ${hasAttendance ? '✅ Has attendance' : '❌ NO attendance record'}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkBiometricSync();
