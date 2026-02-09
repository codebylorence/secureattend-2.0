import sequelize from "../config/database.js";
import Position from "../models/position.js";
import Department from "../models/department.js";

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

const seedInitialData = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Seed Positions
    console.log("\n🌱 Seeding positions...");
    let positionsCreated = 0;
    let positionsExisted = 0;

    for (const positionData of defaultPositions) {
      const [position, created] = await Position.findOrCreate({
        where: { name: positionData.name },
        defaults: positionData
      });
      
      if (created) {
        positionsCreated++;
      } else {
        positionsExisted++;
      }
    }
    
    console.log(`✅ Positions: ${positionsCreated} created, ${positionsExisted} already existed`);

    // Seed Departments
    console.log("\n🌱 Seeding departments...");
    let departmentsCreated = 0;
    let departmentsExisted = 0;

    for (const deptData of defaultDepartments) {
      const [dept, created] = await Department.findOrCreate({
        where: { name: deptData.name },
        defaults: deptData
      });
      
      if (created) {
        departmentsCreated++;
      } else {
        departmentsExisted++;
      }
    }
    
    console.log(`✅ Departments: ${departmentsCreated} created, ${departmentsExisted} already existed`);

    console.log("\n🎉 Initial data seeding completed!");
    
  } catch (error) {
    console.error("❌ Error seeding initial data:", error);
  } finally {
    await sequelize.close();
  }
};

seedInitialData();
