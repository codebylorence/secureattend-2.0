import {
  getAllEmployees,
  createEmployee,
  removeEmployee,
  updateEmployee,
  getEmployeeByEmployeeId
} from "../services/employeeService.js";

// GET /api/employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await getAllEmployees();
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Error fetching employees" });
  }
};

// POST /api/employees
export const addEmployee = async (req, res) => {
  try {
    const result = await createEmployee(req.body);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Error creating employee:", error);
    return res.status(500).json({ message: "Error creating employee", error: error.message });
  }
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the employee details before deleting
    const { default: Employee } = await import("../models/employee.js");
    const { default: User } = await import("../models/user.js");
    const { default: Department } = await import("../models/department.js");
    
    const employee = await Employee.findByPk(id);
    
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Check if this employee is a team leader
    const user = await User.findOne({
      where: { employeeId: id }
    });
    
    if (user && user.role === "teamleader" && employee.department) {
      // Update the department's manager to "No Manager"
      await Department.update(
        { manager: "No Manager" },
        { where: { name: employee.department } }
      );
      console.log(`✅ Updated ${employee.department} manager to "No Manager" after deleting team leader ${employee.employee_id}`);
    }
    
    // Delete the employee
    const deleted = await removeEmployee(id);

    if (!deleted) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Error deleting employee" });
  }
};

//  PUT /api/employees/:id
export const editEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEmployee = await updateEmployee(id, req.body);

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Error updating employee" });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employee = await getEmployeeByEmployeeId(employee_id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { photo } = req.body;

    console.log(`📸 Upload photo request for employee ID: ${id}`);
    console.log(`📸 Photo data length: ${photo?.length || 0} characters`);

    if (!photo) {
      console.log("❌ No photo data provided");
      return res.status(400).json({ error: "Photo data is required" });
    }

    const updatedEmployee = await updateEmployee(id, { photo });

    if (!updatedEmployee) {
      console.log(`❌ Employee not found with ID: ${id}`);
      return res.status(404).json({ message: "Employee not found" });
    }

    console.log(`✅ Photo uploaded successfully for employee: ${updatedEmployee.fullname}`);
    res.status(200).json({
      message: "Photo uploaded successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("❌ Error uploading photo:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Error uploading photo",
      error: error.message 
    });
  }
};

// GET /api/employees/fingerprint-status
export const getFingerprintStatus = async (req, res) => {
  try {
    const sqlite3 = await import('sqlite3');
    const { open } = await import('sqlite');
    
    // Path to biometric app's local database (go up one level from backend folder)
    const dbPath = process.env.BIOMETRIC_DB_PATH || '../BiometricEnrollmentApp/bin/Debug/net9.0-windows/biometric_local.db';
    
    console.log('📂 Attempting to open biometric database at:', dbPath);
    
    // Open connection to biometric database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.default.Database
    });
    
    console.log('✅ Database opened successfully');
    
    // First, check what tables exist
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    console.log('📋 Tables in database:', tables);
    
    // Query to get all employee IDs that have fingerprints enrolled
    const enrolledEmployees = await db.all(
      'SELECT DISTINCT employee_id FROM Enrollments WHERE fingerprint_template IS NOT NULL AND fingerprint_template != ""'
    );
    
    console.log('👆 Enrolled employees found:', enrolledEmployees);
    
    await db.close();
    
    // Create a map of employee_id -> has_fingerprint
    const fingerprintStatus = {};
    enrolledEmployees.forEach(row => {
      fingerprintStatus[row.employee_id] = true;
    });
    
    console.log('📊 Fingerprint status map:', fingerprintStatus);
    
    res.status(200).json(fingerprintStatus);
  } catch (error) {
    console.error("❌ Error checking fingerprint status:", error);
    console.error("Error details:", error.message);
    // Return empty object if database is not accessible
    res.status(200).json({});
  }
};
