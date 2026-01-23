import ScheduleTemplate from "../models/scheduleTemplate.js";
import "../models/associations.js";

const cleanupOldSchedules = async () => {
  try {
    console.log("🧹 Cleaning up old/test schedules...");
    
    const templates = await ScheduleTemplate.findAll({
      order: [["createdAt", "DESC"]]
    });
    
    console.log(`📋 Found ${templates.length} total schedules`);
    
    // Let's identify which schedules to keep vs delete
    console.log("\n🔍 Analyzing schedules:");
    
    const schedulesToKeep = [];
    const schedulesToDelete = [];
    
    templates.forEach(template => {
      const isRecent = new Date(template.createdAt) > new Date('2026-01-24T00:00:00');
      const hasSpecificDate = !!template.specific_date;
      const isUserCreated = template.created_by === 'admin' && isRecent;
      
      console.log(`\n📅 Template ${template.id}:`);
      console.log(`   ${template.department} - ${template.shift_name}`);
      console.log(`   Created: ${template.createdAt}`);
      console.log(`   Type: ${hasSpecificDate ? 'Specific Date' : 'Legacy Days'}`);
      console.log(`   Recent: ${isRecent ? 'Yes' : 'No'}`);
      
      // Keep only the most recent specific-date schedule (the one you created)
      if (hasSpecificDate && isRecent) {
        schedulesToKeep.push(template);
        console.log(`   ✅ KEEP - Recent specific date schedule`);
      } else {
        schedulesToDelete.push(template);
        console.log(`   🗑️ DELETE - Old/legacy schedule`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Schedules to keep: ${schedulesToKeep.length}`);
    console.log(`   Schedules to delete: ${schedulesToDelete.length}`);
    
    if (schedulesToDelete.length > 0) {
      console.log(`\n🗑️ Deleting ${schedulesToDelete.length} old schedules...`);
      
      for (const template of schedulesToDelete) {
        console.log(`   Deleting: ${template.id} - ${template.department} ${template.shift_name}`);
        await ScheduleTemplate.destroy({ where: { id: template.id } });
      }
      
      console.log(`✅ Deleted ${schedulesToDelete.length} old schedules`);
    }
    
    if (schedulesToKeep.length > 0) {
      console.log(`\n✅ Kept schedules:`);
      schedulesToKeep.forEach(template => {
        console.log(`   ${template.id} - ${template.department} ${template.shift_name} (${template.specific_date || 'Legacy'})`);
      });
    }
    
    // Final count
    const remainingCount = await ScheduleTemplate.count();
    console.log(`\n📈 Final count: ${remainingCount} schedules remaining`);
    
  } catch (error) {
    console.error("❌ Error cleaning up schedules:", error);
  }
};

// Run the script
cleanupOldSchedules().then(() => {
  console.log("\n✅ Schedule cleanup completed");
  process.exit(0);
}).catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});