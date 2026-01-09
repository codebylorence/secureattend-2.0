import sequelize from "../config/database.js";
import { seedSupervisorPositions } from "../seeders/supervisorSeeder.js";

async function setupSupervisor() {
  try {
    console.log("🚀 Setting up supervisor role and positions...");
    
    // Ensure database connection
    await sequelize.authenticate();
    console.log("✅ Database connection established");
    
    // Run supervisor position seeder
    await seedSupervisorPositions();
    
    console.log("🎉 Supervisor setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up supervisor:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

setupSupervisor();