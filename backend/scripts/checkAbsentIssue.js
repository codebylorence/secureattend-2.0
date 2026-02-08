import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

async function checkAbsentIssue() {
  try {
    console.log('🔍 Investigating absent marking issue for Fernando and Jhonie...\n');
    
    // Get today's date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Manila' });
    
    console.log(`📅 Today: ${todayDate}`);
    console.log(`🕐 Current time (Philippines): ${currentTime}\n`);
    
    // Check all templates for today
    const [templates] = await sequelize.query(`
      SELECT id, shift_name, start_time, end_time, specific_date, assigned_employees, department
      FROM schedule_templates
      WHERE specific_date = ?
    `, {
      replacements: [todayDate]
    });
    
    console.log(`📋 All Templates for today (${templates.length}):\n`);
    templates.forEach(t => {
      console.log(`  Template ${t.id}: ${t.shift_name}`);
      console.log(`    Time: ${t.start_time} - ${t.end_time}`);
      console.log(`    Department: ${t.department}`);
      console.log(`    Assigned employees: ${t.assigned_employees || 'none'}\n`);
    });
    
    // Find Fernando and Jhonie
    const [employees] = await sequelize.query(`
      SELECT * FROM employees 
      WHERE firstname LIKE '%Fernando%' OR firstname LIKE '%Jhonie%'
    `);
    
    console.log(`👥 Found ${employees.length} employees:\n`);
    
    for (const emp of employees) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Employee: ${emp.firstname} ${emp.lastname} (${emp.employee_id})`);
      console.log(`${'='.repeat(60)}\n`);
      
      // Check attendance records
      const [attendance] = await sequelize.query(`
        SELECT * FROM attendances
        WHERE employee_id = ? AND date = ?
        ORDER BY createdAt DESC
      `, {
        replacements: [emp.employee_id, todayDate]
      });
      
      console.log(`\n📊 Attendance Records (${attendance.length}):`);
      attendance.forEach(att => {
        console.log(`  - Status: ${att.status}`);
        console.log(`    Clock In: ${att.clock_in || 'N/A'}`);
        console.log(`    Clock Out: ${att.clock_out || 'N/A'}`);
        console.log(`    Created: ${att.createdAt}`);
        console.log(`    Updated: ${att.updatedAt}`);
      });
    }
    
    console.log(`\n${'='.repeat(60)}\n`);
    console.log('✅ Investigation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkAbsentIssue();
