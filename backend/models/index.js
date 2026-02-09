import sequelize from "../config/database.js";
import bcrypt from "bcrypt";
import User from "./user.js";
import "./notification.js"; // Import notification model for sync

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected...");

    // Check if tables exist by trying to query Users table
    let tablesExist = false;
    try {
      await sequelize.query("SELECT 1 FROM \"Users\" LIMIT 1");
      tablesExist = true;
      console.log("📊 Database tables already exist");
    } catch (error) {
      console.log("📊 Database tables don't exist yet, will create them");
    }

    if (!tablesExist) {
      // First run: Create tables without foreign key constraints
      console.log("🔄 Creating all database tables...");
      
      // Sync with force:true but without foreign key constraints initially
      await sequelize.sync({ 
        force: true,
        hooks: false // Disable hooks during sync
      });
      
      console.log("✅ Tables created successfully (first run)");
    } else {
      // Subsequent runs: Just sync without altering
      await sequelize.sync({ alter: false });
      console.log("✅ Tables synchronized successfully");
    }

    //  Create default admin account if not existing
    await createDefaultAdmin();

  } catch (error) {
    console.error("❌ Database sync error:", error.message);
    
    // If it's a foreign key error, try to give helpful message
    if (error.message.includes('does not exist')) {
      console.error("💡 Hint: This might be a circular dependency issue.");
      console.error("💡 Try deleting the PostgreSQL database and creating a new one.");
    }
    
    throw error; // Re-throw to prevent server from starting
  }
};

//  Helper function to ensure admin exists
const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ where: { role: "admin" } });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("123456", 10);

      await User.create({
        username: "admin",
        password: hashedPassword,
        role: "admin",
      });

      console.log(" Default admin created: username='admin', password='123456'");
    } else {
      console.log(" Admin account already exists — skipping creation.");
    }
  } catch (error) {
    console.error(" Error creating default admin:", error);
  }
};

export { sequelize, syncDatabase };


