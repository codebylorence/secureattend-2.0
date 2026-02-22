import sequelize from "../config/database.js";

async function createPasswordResetTable() {
  try {
    console.log("🔄 Creating password_resets table...");

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expiresAt DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_token (token),
        INDEX idx_userId (userId)
      );
    `);

    console.log("✅ password_resets table created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating password_resets table:", error);
    process.exit(1);
  }
}

createPasswordResetTable();
