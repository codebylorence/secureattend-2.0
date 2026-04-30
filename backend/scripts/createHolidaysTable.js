import sequelize from "../config/database.js";

async function createHolidaysTable() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Holidays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`date\` DATE NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        type ENUM('Regular Holiday','Special Non-Working Day') NOT NULL DEFAULT 'Regular Holiday',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Holidays table created (or already exists)");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createHolidaysTable();
