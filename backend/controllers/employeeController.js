import {
  getAllEmployees,
  createEmployee,
  removeEmployee,
  updateEmployee,
  getEmployeeByEmployeeId
} from "../services/employeeService.js";

// GET /employees (for biometric app compatibility)
export const getEmployeesForBiometric = async (req, res) => {
  try {
    const employees = await getAllEmployees();
    
    // Filter only active employees for biometric app
    const activeEmployees = employees.filter(emp => emp.status === 'Active');
    
    // Format specifically for biometric app
    const biometricEmployees = activeEmployees.map(employee => {
      const employeeData = employee.toJSON ? employee.toJSON() : employee;
      
      // Generate fullname from firstname and lastname for backward compatibility
      let fullname = '';
      if (employeeData.firstname && employeeData.lastname) {
        fullname = `${employeeData.firstname} ${employeeData.lastname}`;
      } else if (employeeData.firstname) {
        fullname = employeeData.firstname;
      } else {
        fullname = `Employee ${employeeData.employee_id}`;
      }
      
      return {
        employee_id: employeeData.employee_id,
        employeeId: employeeData.employee_id, // For compatibility
        firstname: employeeData.firstname || '',
        lastname: employeeData.lastname || '',
        fullname: fullname, // Keep for biometric app compatibility
        department: employeeData.department || 'No Department',
        status: employeeData.status || 'Active'
      };
    });
    
    console.log(`📱 Returning ${biometricEmployees.length} active employees for biometric app`);
    res.status(200).json(biometricEmployees);
  } catch (error) {
    console.error("Error fetching employees for biometric app:", error);
    res.status(500).json({ message: "Error fetching employees" });
  }
};

// GET /api/employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await getAllEmployees();
    
    // Return employees with separate firstname and lastname fields
    const processedEmployees = employees.map(employee => {
      const employeeData = employee.toJSON ? employee.toJSON() : employee;
      
      // Include role from user relationship
      const role = employeeData.user?.role || 'employee';
      
      return {
        ...employeeData,
        firstname: employeeData.firstname || '',
        lastname: employeeData.lastname || '',
        role: role
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
// Returns fingerprint enrollment status from PostgreSQL database (not local SQLite)
export const getFingerprintStatus = async (req, res) => {
  try {
    console.log('📊 Getting fingerprint status from PostgreSQL...');
    
    // Get all employees with their has_fingerprint status
    const employees = await Employee.findAll({
      attributes: ['employee_id', 'has_fingerprint'],
      where: {
        status: 'Active'
      }
    });
    
    // Create a map of employee_id -> has_fingerprint
    const fingerprintStatus = {};
    employees.forEach(emp => {
      if (emp.has_fingerprint) {
        fingerprintStatus[emp.employee_id] = true;
      }
    });
    
    console.log(`✅ Found ${Object.keys(fingerprintStatus).length} employees with fingerprints enrolled`);
    
    res.status(200).json(fingerprintStatus);
  } catch (error) {
    console.error("❌ Error checking fingerprint status:", error);
    console.error("Error details:", error.message);
    // Return empty object if there's an error
    res.status(200).json({});
  }
};

// PUT /api/employees/:employeeId/fingerprint - Update fingerprint enrollment status
export const updateFingerprintStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { has_fingerprint } = req.body;

    console.log(`📝 Updating fingerprint status for ${employeeId}: ${has_fingerprint}`);

    // Find employee
    const employee = await Employee.findOne({ where: { employee_id: employeeId } });
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: `Employee ${employeeId} not found` 
      });
    }

    // Update has_fingerprint field
    await employee.update({ has_fingerprint });

    console.log(`✅ Updated ${employeeId} has_fingerprint to ${has_fingerprint}`);

    res.status(200).json({
      success: true,
      message: `Fingerprint status updated for ${employeeId}`,
      employee: {
        employee_id: employee.employee_id,
        firstname: employee.firstname,
        lastname: employee.lastname,
        has_fingerprint: employee.has_fingerprint
      }
    });
  } catch (error) {
    console.error("❌ Error updating fingerprint status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update fingerprint status",
      error: error.message 
    });
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
