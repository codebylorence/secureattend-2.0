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

    // Use alter: true for PostgreSQL to create/update tables
    // Use force: true ONLY if tables don't exist (first run)
    // Use alter: false for MySQL to prevent key conflicts
    const syncOptions = process.env.DATABASE_URL 
      ? { force: !tablesExist, alter: !tablesExist } // PostgreSQL: force create on first run, then alter
      : { alter: false }; // MySQL: don't alter

    await sequelize.sync(syncOptions);
    
    if (!tablesExist) {
      console.log("✅ Tables created successfully (first run)");
    } else {
      console.log("✅ Tables synchronized successfully");
    }

    //  Create default admin account if not existing
    await createDefaultAdmin();

  } catch (error) {
    console.error("❌ Database connection error:", error);
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


