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
