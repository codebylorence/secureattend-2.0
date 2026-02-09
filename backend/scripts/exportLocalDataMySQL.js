import { Sequelize } from "sequelize";
import Position from "../models/position.js";
import Employee from "../models/employee.js";
import Department from "../models/department.js";

// Force MySQL connection for local database
const sequelize = new Sequelize('secureattend_db', 'root', 'rence652', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

// Re-initialize models with local connection
Position.init(Position.rawAttributes, { sequelize, modelName: 'Position' });
Employee.init(Employee.rawAttributes, { sequelize, modelName: 'Employee' });
Department.init(Department.rawAttributes, { sequelize, modelName: 'Department' });

const exportLocalData = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to local MySQL database\n");

    // Get all positions
    console.log("📋 POSITIONS:");
    console.log("=".repeat(50));
    const positions = await Position.findAll({
      order: [['name', 'ASC']]
    });
    
    positions.forEach(pos => {
      console.log(`- ${pos.name}`);
    });
    console.log(`\nTotal: ${positions.length} positions\n`);

    // Get all departments
    console.log("🏢 DEPARTMENTS:");
    console.log("=".repeat(50));
    const departments = await Department.findAll({
      order: [['name', 'ASC']]
    });
    
    departments.forEach(dept => {
      console.log(`- ${dept.name} ${dept.manager ? `(Manager: ${dept.manager})` : ''}`);
    });
    console.log(`\nTotal: ${departments.length} departments\n`);

    // Get sample employees
    console.log("👥 SAMPLE EMPLOYEES (first 10):");
    console.log("=".repeat(50));
    const employees = await Employee.findAll({
      limit: 10,
      order: [['id', 'ASC']]
    });
    
    employees.forEach(emp => {
      console.log(`ID: ${emp.employee_id} | ${emp.firstname} ${emp.lastname} | ${emp.position} | ${emp.department}`);
    });
    console.log(`\nShowing 10 of ${await Employee.count()} total employees\n`);

    // Export as JSON for seeding
    console.log("\n📦 EXPORT DATA FOR SEEDING:");
    console.log("=".repeat(50));
    
    const positionsData = positions.map(p => ({
      name: p.name,
      description: p.description || `${p.name} position`
    }));
    
    const departmentsData = departments.map(d => ({
      name: d.name,
      description: d.description || `${d.name} department`,
      manager: d.manager || null
    }));

    const employeesData = employees.map(e => ({
      employee_id: e.employee_id,
      firstname: e.firstname,
      lastname: e.lastname,
      position: e.position,
      department: e.department,
      contact_number: e.contact_number,
      email: e.email,
      date_hired: e.date_hired,
      status: e.status
    }));

    console.log("\nPositions JSON:");
    console.log(JSON.stringify(positionsData, null, 2));
    
    console.log("\n\nDepartments JSON:");
    console.log(JSON.stringify(departmentsData, null, 2));
    
    console.log("\n\nSample Employees JSON:");
    console.log(JSON.stringify(employeesData, null, 2));

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
  }
};

exportLocalData();
