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
    
    // Ensure fullname is populated for all employees (for biometric app compatibility)
    const processedEmployees = employees.map(employee => {
      const employeeData = employee.toJSON ? employee.toJSON() : employee;
      
      // Ensure fullname is populated
      let fullname = employeeData.fullname;
      if (!fullname || fullname.trim() === '' || fullname === 'null') {
        if (employeeData.firstname && employeeData.lastname) {
          fullname = `${employeeData.firstname} ${employeeData.lastname}`;
        } else if (employeeData.firstname) {
          fullname = employeeData.firstname;
        } else {
          fullname = `Employee ${employeeData.employee_id}`;
        }
      }
      
      return {
        ...employeeData,
        fullname: fullname
      };
    });
    
    res.status(200).json(processedEmployees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Error fetching employees" });
  }
};

// POST /api/employees
export const addEmployee = async (req, res) => {
  try {
    console.log("📥 Received employee creation request:");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Username present:", !!req.body.username);
    console.log("Password present:", !!req.body.password);
    
    const result = await createEmployee(req.body);
    
    // Send notification to admins and supervisors about new employee
    try {
      const { notifyAdmins, notifySupervisors } = await import("../services/notificationService.js");
      
      const message = `New employee ${result.employee.first_name} ${result.employee.last_name} (${result.employee.employee_id}) has been added to ${result.employee.department}`;
      
      // Notify admins
      await notifyAdmins(
        "New Employee Added",
        message,
        "general",
        result.employee.id,
        "system"
      );
      
      // Notify supervisors in the same department
      if (result.employee.department) {
        await notifySupervisors(
          [result.employee.department],
          "New Employee Added",
          message,
          "general",
          result.employee.id,
          "system"
        );
      }
      
      console.log("✅ Employee creation notifications sent");
    } catch (notifyError) {
      console.error("❌ Error sending employee creation notifications:", notifyError);
      // Don't fail the creation if notifications fail
    }
    
    console.log("✅ Employee creation successful");
    return res.status(201).json(result);
  } catch (error) {
    console.error("❌ Error creating employee:", error);
    return res.status(500).json({ message: "Error creating employee", error: error.message });
  }
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Attempting to delete employee with ID: ${id}`);
    
    // Get employee details before deletion for notifications
    const employeeToDelete = await getEmployeeByEmployeeId(id);
    
    // Use the service function which handles all the logic
    const deleted = await removeEmployee(id);

    if (!deleted) {
      console.log(`❌ Employee not found with ID: ${id}`);
      return res.status(404).json({ message: "Employee not found" });
    }

    // Send notification to admins and supervisors about employee deletion
    if (employeeToDelete) {
      try {
        const { notifyAdmins, notifySupervisors } = await import("../services/notificationService.js");
        
        const message = `Employee ${employeeToDelete.first_name} ${employeeToDelete.last_name} (${employeeToDelete.employee_id}) has been removed from ${employeeToDelete.department}`;
        
        // Notify admins
        await notifyAdmins(
          "Employee Removed",
          message,
          "general",
          null,
          "admin"
        );
        
        // Notify supervisors in the same department
        if (employeeToDelete.department) {
          await notifySupervisors(
            [employeeToDelete.department],
            "Employee Removed",
            message,
            "general",
            null,
            "admin"
          );
        }
        
        console.log("✅ Employee deletion notifications sent");
      } catch (notifyError) {
        console.error("❌ Error sending employee deletion notifications:", notifyError);
        // Don't fail the deletion if notifications fail
      }
    }

    console.log(`✅ Employee deleted successfully with ID: ${id}`);
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting employee:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Error deleting employee", 
      error: error.message 
    });
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

// Test endpoint to verify user creation
export const testUserCreation = async (req, res) => {
  try {
    console.log("🧪 Testing user creation...");
    
    // Import models
    const User = (await import("../models/user.js")).default;
    const Employee = (await import("../models/employee.js")).default;
    
    // Check if tables exist
    const users = await User.findAll({ limit: 5 });
    const employees = await Employee.findAll({ limit: 5 });
    
    console.log(`📊 Found ${users.length} users and ${employees.length} employees`);
    
    res.status(200).json({
      message: "Database connection test successful",
      userCount: users.length,
      employeeCount: employees.length,
      users: users.map(u => ({ id: u.id, username: u.username, role: u.role, employeeId: u.employeeId })),
      employees: employees.map(e => ({ id: e.id, employee_id: e.employee_id, firstname: e.firstname, lastname: e.lastname }))
    });
  } catch (error) {
    console.error("❌ Test failed:", error);
    res.status(500).json({ 
      message: "Test failed", 
      error: error.message,
      stack: error.stack 
    });
  }
};
