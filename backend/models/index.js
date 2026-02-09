import sequelize from "../config/database.js";
import bcrypt from "bcrypt";
import User from "./user.js";
import Position from "./position.js";
import Department from "./department.js";
import Employee from "./employee.js";
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
      // First run: Create tables
      console.log("🔄 Creating all database tables...");
      
      await sequelize.sync({ 
        force: false,
        alter: true, // Alter tables to match models
        hooks: false
      });
      
      console.log("✅ Tables created successfully (first run)");
    } else {
      // Subsequent runs: Alter tables to match models
      await sequelize.sync({ alter: true });
      console.log("✅ Tables synchronized successfully");
    }

    //  Create default admin account if not existing
    await createDefaultAdmin();

    // Seed initial data (positions and departments)
    await seedInitialData();

    // Seed sample employees
    await seedSampleEmployees();

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
    // Positions from your local database
    const defaultPositions = [
      { name: "Helper", description: "Assists with general warehouse tasks and supports daily operations" },
      { name: "Picker", description: "Selects and prepares items for orders based on warehouse requests" },
      { name: "Reach Truck Operator", description: "Operates reach truck equipment for pallet movement and storage" },
      { name: "Receiving", description: "Manages incoming goods and verifies deliveries" },
      { name: "Supervisor", description: "Manages departments and oversees overall warehouse operations" },
      { name: "Team Leader", description: "Leads and manages team operations" },
      { name: "Warehouse Admin", description: "Handles warehouse records, reports, and administrative support" }
    ];

    // Departments from your local database
    const defaultDepartments = [
      { name: "Zone A", description: "Picker zone", manager: null },
      { name: "Zone B", description: "Helper zone", manager: null },
      { name: "Zone C", description: "Zone C operations", manager: null },
      { name: "Zone D", description: "Zone D operations", manager: null },
      { name: "Zone E", description: "Zone E operations", manager: null },
      { name: "Company-wide", description: "Company-wide operations", manager: null }
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

// Helper function to seed sample employees
const seedSampleEmployees = async () => {
  try {
    const employeeCount = await Employee.count();
    if (employeeCount > 0) {
      console.log(`⏭️  Employees already exist (${employeeCount} found)`);
      return;
    }

    console.log("🌱 Seeding sample employees...");
    
    // Sample employees from your local database
    const sampleEmployees = [
      {
        employee_id: "TSI00001",
        firstname: "Resty",
        lastname: "Ellana",
        position: "Supervisor",
        department: "Company-wide",
        contact_number: "09198947992",
        email: "resty@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00002",
        firstname: "Darshan",
        lastname: "Lobarbio",
        position: "Warehouse Admin",
        department: "Company-wide",
        contact_number: "09123456789",
        email: "darshan@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00003",
        firstname: "Fernando",
        lastname: "Dela Cruz",
        position: "Team Leader",
        department: "Zone A",
        contact_number: "09123456789",
        email: "fernando@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00004",
        firstname: "Kenny",
        lastname: "Siatita",
        position: "Team Leader",
        department: "Zone B",
        contact_number: "09123456789",
        email: "kenny@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00005",
        firstname: "Jerico",
        lastname: "Llaneta",
        position: "Team Leader",
        department: "Zone C",
        contact_number: "09198947992",
        email: "jerico@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00006",
        firstname: "Novaleen",
        lastname: "Bonque",
        position: "Team Leader",
        department: "Zone D",
        contact_number: "09123456789",
        email: "novaleen@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00007",
        firstname: "Jhonie",
        lastname: "Estriba",
        position: "Helper",
        department: "Zone A",
        contact_number: "09123456789",
        email: "jhonie@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00008",
        firstname: "Warren",
        lastname: "Gabas",
        position: "Helper",
        department: "Zone B",
        contact_number: "09123456789",
        email: "warren@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00009",
        firstname: "Rosalyyn",
        lastname: "Costales",
        position: "Helper",
        department: "Zone C",
        contact_number: "09123456789",
        email: "rosalyn@gmail.com",
        status: "Active"
      },
      {
        employee_id: "TSI00010",
        firstname: "Lester",
        lastname: "Batiller",
        position: "Helper",
        department: "Zone D",
        contact_number: "09123456789",
        email: "lester@gmail.com",
        status: "Active"
      }
    ];

    await Employee.bulkCreate(sampleEmployees);
    console.log(`✅ Created ${sampleEmployees.length} sample employees`);

    // Create user accounts for team leaders and supervisors
    console.log("🌱 Creating user accounts for management...");
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    const userAccounts = [
      { username: "resty", password: hashedPassword, firstname: "Resty", lastname: "Ellana", role: "supervisor", employeeId: 1 },
      { username: "darshan", password: hashedPassword, firstname: "Darshan", lastname: "Lobarbio", role: "warehouseadmin", employeeId: 2 },
      { username: "fernando", password: hashedPassword, firstname: "Fernando", lastname: "Dela Cruz", role: "teamleader", employeeId: 3 },
      { username: "kenny", password: hashedPassword, firstname: "Kenny", lastname: "Siatita", role: "teamleader", employeeId: 4 },
      { username: "jerico", password: hashedPassword, firstname: "Jerico", lastname: "Llaneta", role: "teamleader", employeeId: 5 },
      { username: "novaleen", password: hashedPassword, firstname: "Novaleen", lastname: "Bonque", role: "teamleader", employeeId: 6 }
    ];

    await User.bulkCreate(userAccounts);
    console.log(`✅ Created ${userAccounts.length} user accounts (password: 123456)`);

    // Update department managers
    await Department.update({ manager: "Fernando Dela Cruz" }, { where: { name: "Zone A" } });
    await Department.update({ manager: "Kenny Siatita" }, { where: { name: "Zone B" } });
    await Department.update({ manager: "Jerico Llaneta" }, { where: { name: "Zone C" } });
    await Department.update({ manager: "Novaleen Bonque" }, { where: { name: "Zone D" } });
    console.log("✅ Updated department managers");

  } catch (error) {
    console.error("❌ Error seeding sample employees:", error);
  }
};

export { sequelize, syncDatabase };


