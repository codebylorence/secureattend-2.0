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

    if (!photo) {
      return res.status(400).json({ error: "Photo data is required" });
    }

    const updatedEmployee = await updateEmployee(id, { photo });

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Photo uploaded successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({ message: "Error uploading photo" });
  }
};
