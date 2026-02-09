import sequelize from "../config/database.js";
import bcrypt from "bcrypt";
import User from "./user.js";
import Position from "./position.js";
import Department from "./department.js";
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

    // Seed initial data (positions and departments)
    await seedInitialData();

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

// Helper function to seed initial data
const seedInitialData = async () => {
  try {
    const defaultPositions = [
      { name: "Software Developer", description: "Develops and maintains software applications" },
      { name: "Senior Software Developer", description: "Senior-level software development role" },
      { name: "Project Manager", description: "Manages projects and coordinates teams" },
      { name: "Business Analyst", description: "Analyzes business requirements and processes" },
      { name: "Quality Assurance Engineer", description: "Tests and ensures software quality" },
      { name: "System Administrator", description: "Manages IT infrastructure and systems" },
      { name: "HR Specialist", description: "Handles human resources functions" },
      { name: "Accountant", description: "Manages financial records and transactions" },
      { name: "Marketing Specialist", description: "Develops and executes marketing strategies" },
      { name: "Team Leader", description: "Leads and manages team operations" },
      { name: "Department Manager", description: "Manages department operations and staff" },
      { name: "Supervisor", description: "Supervises and oversees team operations" },
      { name: "Admin", description: "Administrative role with system access" },
      { name: "System Admin", description: "System administrator with full access" },
      { name: "HR Manager", description: "Manages human resources department" },
      { name: "Finance Manager", description: "Manages finance department operations" },
      { name: "Operations Manager", description: "Manages daily operations" },
      { name: "Director", description: "Senior leadership role overseeing multiple departments" },
      { name: "Warehouse Admin", description: "Manages warehouse operations and logistics" },
      { name: "Warehouse Manager", description: "Senior warehouse management role" },
      { name: "Warehouse Supervisor", description: "Supervises warehouse operations" },
      { name: "Inventory Manager", description: "Manages inventory and stock control" },
      { name: "Logistics Coordinator", description: "Coordinates logistics and shipping" },
      { name: "Picker", description: "Picks items for order fulfillment" },
      { name: "Packer", description: "Packs items for shipping" },
      { name: "Inventory Clerk", description: "Maintains inventory records" },
      { name: "Shipping Clerk", description: "Handles shipping and receiving" },
      { name: "Forklift Operator", description: "Operates forklift equipment" },
      { name: "Warehouse Associate", description: "General warehouse operations" }
    ];

    const defaultDepartments = [
      { name: "IT", description: "Information Technology Department" },
      { name: "HR", description: "Human Resources Department" },
      { name: "Finance", description: "Finance and Accounting Department" },
      { name: "Operations", description: "Operations Department" },
      { name: "Warehouse", description: "Warehouse and Logistics Department" },
      { name: "Marketing", description: "Marketing Department" }
    ];

    // Check if positions already exist
    const positionCount = await Position.count();
    if (positionCount === 0) {
      console.log("🌱 Seeding positions...");
      await Position.bulkCreate(defaultPositions);
      console.log(`✅ Created ${defaultPositions.length} positions`);
    } else {
      console.log(`⏭️  Positions already exist (${positionCount} found)`);
    }

    // Check if departments already exist
    const departmentCount = await Department.count();
    if (departmentCount === 0) {
      console.log("🌱 Seeding departments...");
      await Department.bulkCreate(defaultDepartments);
      console.log(`✅ Created ${defaultDepartments.length} departments`);
    } else {
      console.log(`⏭️  Departments already exist (${departmentCount} found)`);
    }
  } catch (error) {
    console.error("❌ Error seeding initial data:", error);
  }
};

export { sequelize, syncDatabase };


