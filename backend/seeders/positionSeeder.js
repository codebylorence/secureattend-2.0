import Position from "../models/position.js";

const defaultPositions = [
  { name: "Software Developer", description: "Develops and maintains software applications" },
  { name: "Senior Software Developer", description: "Senior-level software development role" },
  { name: "Project Manager", description: "Manages projects and coordinates teams" },
  { name: "Business Analyst", description: "Analyzes business requirements and processes" },
  { name: "Quality Assurance Engineer", description: "Tests and ensures software quality" },
  { name: "System Administrator", description: "Manages IT infrastructure and systems" },
  { name: "HR Specialist", description: "Handles human resources functions" },
  { name: "Accountant", description: "Manages financial records and transactions" },
  { name: "Marketing Specialist", description: "Develops and executes marketing strategies" },
  { name: "Team Leader", description: "Leads and manages team operations" },
  { name: "Department Manager", description: "Manages department operations and staff" },
  { name: "Supervisor", description: "Supervises and oversees team operations" },
  { name: "Admin", description: "Administrative role with system access" },
  { name: "System Admin", description: "System administrator with full access" },
  { name: "HR Manager", description: "Manages human resources department" },
  { name: "Finance Manager", description: "Manages finance department operations" },
  { name: "Operations Manager", description: "Manages daily operations" },
  { name: "Director", description: "Senior leadership role overseeing multiple departments" }
];

export const seedPositions = async () => {
  try {
    console.log("🌱 Seeding positions...");
    
    for (const positionData of defaultPositions) {
      const [position, created] = await Position.findOrCreate({
        where: { name: positionData.name },
        defaults: positionData
      });
      
      if (created) {
        console.log(`✅ Created position: ${position.name}`);
      } else {
        console.log(`⏭️  Position already exists: ${position.name}`);
      }
    }
    
    console.log("🎉 Position seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding positions:", error);
  }
};