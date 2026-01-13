import bcrypt from "bcryptjs";
import User from "../models/user.js";
import sequelize from "../config/database.js";

const createAdmin = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { username: "admin" }
    });

    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.username);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const admin = await User.create({
      username: "admin",
      password: hashedPassword,
      name: "System Administrator",
      role: "admin",
      employeeId: null // Admin doesn't need to be linked to an employee
    });

    console.log("Admin user created successfully:");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("Name: System Administrator");
    console.log("Role: admin");
    
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await sequelize.close();
  }
};

createAdmin();