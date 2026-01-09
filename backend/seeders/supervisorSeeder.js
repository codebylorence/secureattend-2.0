import Position from "../models/position.js";

const supervisorPositions = [
  {
    name: "Supervisor",
    level: "Senior",
    description: "Supervises team members and manages daily operations within a department"
  },
  {
    name: "Department Supervisor",
    level: "Senior", 
    description: "Oversees department operations and team performance"
  },
  {
    name: "Shift Supervisor",
    level: "Senior",
    description: "Manages shift operations and team coordination"
  }
];

export const seedSupervisorPositions = async () => {
  try {
    console.log("🌱 Seeding supervisor positions...");
    
    for (const position of supervisorPositions) {
      const [positionRecord, created] = await Position.findOrCreate({
        where: { name: position.name },
        defaults: position
      });
      
      if (created) {
        console.log(`✅ Created position: ${position.name}`);
      } else {
        console.log(`ℹ️ Position already exists: ${position.name}`);
      }
    }
    
    console.log("✅ Supervisor positions seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding supervisor positions:", error);
    throw error;
  }
};

// Run seeder if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSupervisorPositions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}