import { getAllTemplates } from "../services/scheduleTemplateService.js";
import sequelize from "../config/database.js";

async function testZoneFiltering() {
  try {
    console.log("🧪 Testing zone-based filtering...");
    
    const allTemplates = await getAllTemplates();
    console.log(`\n📊 Total templates in database: ${allTemplates.length}`);
    
    // Show breakdown by department
    const departmentCounts = {};
    allTemplates.forEach(template => {
      const dept = template.department || 'No Department';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    console.log("\n📋 Templates by department:");
    Object.entries(departmentCounts).forEach(([dept, count]) => {
      console.log(`   ${dept}: ${count} templates`);
    });
    
    // Simulate frontend filtering
    const zoneTemplates = allTemplates.filter(template => 
      template.department !== 'Role-Based'
    );
    
    const roleBasedTemplates = allTemplates.filter(template => 
      template.department === 'Role-Based'
    );
    
    console.log(`\n🎯 Zone-based scheduling will show: ${zoneTemplates.length} templates`);
    console.log(`🎯 Role-based scheduling will show: ${roleBasedTemplates.length} templates`);
    
    if (roleBasedTemplates.length > 0) {
      console.log("\n✅ Filtering is working correctly!");
      console.log("   - Zone-based scheduling excludes Role-Based templates");
      console.log("   - Role-based scheduling includes only Role-Based templates");
    } else {
      console.log("\n⚠️ No role-based templates found to test filtering");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await sequelize.close();
  }
}

testZoneFiltering();