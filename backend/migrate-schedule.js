import sequelize from "./config/database.js";

async function migrateScheduleTable() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database");

    // Drop the Schedules table if it exists
    await sequelize.query("DROP TABLE IF EXISTS `Schedules`");
    console.log("✅ Dropped old Schedules table");

    // Create the new table with all columns
    await sequelize.query(`
      CREATE TABLE \`Schedules\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`employee_id\` VARCHAR(255),
        \`department\` VARCHAR(255),
        \`shift_name\` VARCHAR(255) NOT NULL,
        \`start_time\` VARCHAR(255) NOT NULL,
        \`end_time\` VARCHAR(255) NOT NULL,
        \`days\` JSON NOT NULL,
        \`is_template\` BOOLEAN DEFAULT FALSE,
        \`created_by\` VARCHAR(255),
        \`status\` ENUM('Active', 'Inactive') DEFAULT 'Active',
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL
      )
    `);
    console.log("✅ Created new Schedules table with all columns");

    await sequelize.close();
    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateScheduleTable();
