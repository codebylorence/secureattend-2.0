import sequelize from "../config/database.js";

async function checkTableStructure() {
  try {
    const [results] = await sequelize.query("DESCRIBE schedule_templates");
    console.log("Schedule Templates table structure:");
    console.table(results);
    
    // Check if assigned_employees column exists
    const hasAssignedEmployees = results.some(col => col.Field === 'assigned_employees');
    console.log("Has assigned_employees column:", hasAssignedEmployees);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTableStructure();