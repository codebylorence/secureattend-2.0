import sequelize from '../config/database.js';

async function cleanupStaleTemplates() {
  try {
    console.log('🧹 Cleaning up stale template assignments...');
    
    // Get current date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    console.log(`📅 Today is: ${todayDate}`);
    
    // Find templates with specific_date in the past that still have assignments
    const [staleTemplates] = await sequelize.query(`
      SELECT id, shift_name, department, specific_date, assigned_employees, createdAt
      FROM schedule_templates 
      WHERE status = 'Active' 
      AND specific_date IS NOT NULL
      AND specific_date < '${todayDate}'
      AND assigned_employees IS NOT NULL
      ORDER BY specific_date DESC
    `);
    
    console.log(`📋 Found ${staleTemplates.length} templates with past specific dates:`);
    
    let cleanedCount = 0;
    
    for (const template of staleTemplates) {
      let assignedEmployees = [];
      try {
        assignedEmployees = JSON.parse(template.assigned_employees);
      } catch (e) {
        console.error(`Error parsing assigned_employees for template ${template.id}:`, e);
        continue;
      }
      
      console.log(`  - Template ${template.id}: ${template.shift_name} (${template.department})`);
      console.log(`    Specific date: ${template.specific_date} (${assignedEmployees.length} employees assigned)`);
      console.log(`    Created: ${template.createdAt}`);
      
      // Ask user if they want to clean this template
      console.log(`    Should we clean this template? It's from ${template.specific_date} and today is ${todayDate}`);
      
      // For now, let's clean templates older than 7 days automatically
      const templateDate = new Date(template.specific_date);
      const daysDiff = Math.floor((now - templateDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 7) {
        console.log(`    🗑️ Auto-cleaning template ${template.id} (${daysDiff} days old)`);
        
        // Set assigned_employees to null to clean up the assignment
        await sequelize.query(`
          UPDATE schedule_templates 
          SET assigned_employees = NULL 
          WHERE id = ${template.id}
        `);
        
        cleanedCount++;
      } else {
        console.log(`    ⏳ Keeping template ${template.id} (only ${daysDiff} days old)`);
      }
    }
    
    console.log(`\n✅ Cleanup completed. Cleaned ${cleanedCount} templates.`);
    
    // Show remaining active templates for today
    const [todayTemplates] = await sequelize.query(`
      SELECT id, shift_name, department, specific_date, assigned_employees
      FROM schedule_templates 
      WHERE status = 'Active' 
      AND specific_date = '${todayDate}'
      AND assigned_employees IS NOT NULL
      ORDER BY createdAt DESC
    `);
    
    console.log(`\n📊 Active templates for today (${todayDate}): ${todayTemplates.length}`);
    todayTemplates.forEach(template => {
      let assignedCount = 0;
      try {
        const assigned = JSON.parse(template.assigned_employees);
        assignedCount = assigned.length;
      } catch (e) {
        // ignore
      }
      console.log(`  - Template ${template.id}: ${template.shift_name} (${assignedCount} employees)`);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error cleaning up stale templates:', error);
    await sequelize.close();
    process.exit(1);
  }
}

cleanupStaleTemplates();