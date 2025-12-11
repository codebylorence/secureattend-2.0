import Position from "../models/position.js";

const defaultPositions = [
  { name: "Software Developer", description: "Develops and maintains software applications", level: "Junior" },
  { name: "Senior Software Developer", description: "Senior-level software development role", level: "Senior" },
  { name: "Project Manager", description: "Manages projects and coordinates teams", level: "Manager" },
  { name: "Business Analyst", description: "Analyzes business requirements and processes", level: "Junior" },
  { name: "Quality Assurance Engineer", description: "Tests and ensures software quality", level: "Junior" },
  { name: "System Administrator", description: "Manages IT infrastructure and systems", level: "Senior" },
  { name: "HR Specialist", description: "Handles human resources functions", level: "Junior" },
  { name: "Accountant", description: "Manages financial records and transactions", level: "Junior" },
  { name: "Marketing Specialist", description: "Develops and executes marketing strategies", level: "Junior" },
  { name: "Team Leader", description: "Leads and manages team operations", level: "Lead" },
  { name: "Department Manager", description: "Manages department operations and staff", level: "Manager" },
  { name: "Director", description: "Senior leadership role overseeing multiple departments", level: "Director" }
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