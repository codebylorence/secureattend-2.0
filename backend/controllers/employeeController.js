import {
  getAllEmployees,
  createEmployee,
  removeEmployee,
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
    const newEmployee = await createEmployee(req.body);
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error("Error adding employee:", error);
    res.status(500).json({ message: "Error adding employee" });
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
