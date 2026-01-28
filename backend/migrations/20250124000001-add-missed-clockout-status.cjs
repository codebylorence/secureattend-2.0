const { Sequelize } = require('sequelize');
const config = require('../config/config.json');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  dialect: dbConfig.dialect,
  logging: false
});

const addMissedClockoutStatus = async () => {
  try {
    console.log("Adding 'Missed Clock-out' status to attendance enum...");
    
    // MySQL/MariaDB: Modify the ENUM to include the new 'Missed Clock-out' value
    await sequelize.query(`
      ALTER TABLE attendances 
      MODIFY COLUMN status 
      ENUM('IN', 'COMPLETED', 'Present', 'Late', 'Absent', 'Overtime', 'Missed Clock-out') 
      DEFAULT 'Present'
    `);
    
    console.log("✅ Successfully added 'Missed Clock-out' status to attendance enum!");
    
    console.log("✅ Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating enum:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
};

addMissedClockoutStatus();