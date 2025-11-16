import { Sequelize } from "sequelize";

// Direct database connection (bypassing config file)
const sequelize = new Sequelize("secureattend_db", "root", "rence652", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

async function addShiftsColumn() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Add shifts column
    await sequelize.getQueryInterface().addColumn("Schedules", "shifts", {
      type: sequelize.Sequelize.JSON,
      allowNull: true,
      comment: "Array of shift objects: [{shift_name, start_time, end_time, days: []}]"
    });

    console.log("✅ Added 'shifts' column to Schedules table");
    
    process.exit(0);
  } catch (error) {
    if (error.message.includes("Duplicate column name")) {
      console.log("⚠️ Column 'shifts' already exists");
      process.exit(0);
    }
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addShiftsColumn();
