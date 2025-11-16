import Department from "../models/department.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']]
    });

    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await Employee.count({
          where: { department: dept.name }
        });
        return {
          ...dept.toJSON(),
          employeeCount
        };
      })
    );

    res.status(200).json(departmentsWithCount);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

export const addDepartment = async (req, res) => {
  try {
    const { name, description, manager } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Department name is required" });
    }

    const department = await Department.create({
      name,
      description,
      manager
    });

    res.status(201).json(department);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: "Department already exists" });
    }
    console.error("Error adding department:", error);
    res.status(500).json({ error: "Failed to add department" });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    const oldName = department.name;
    const oldManager = department.manager;

    await department.update({
      name: name || department.name,
      description: description !== undefined ? description : department.description,
      manager: manager !== undefined ? manager : department.manager
    });

    // If department name changed, update all employees in that department
    if (name && name !== oldName) {
      await Employee.update(
        { department: name },
        { where: { department: oldName } }
      );
    }

    // If manager changed, update the team leader's department
    if (manager !== undefined && manager !== oldManager) {
      // If a new manager is assigned
      if (manager && manager !== "") {
        await Employee.update(
          { department: department.name },
          { 
            where: { 
              fullname: manager,
              position: "Team Leader"
            } 
          }
        );
      }

      // If old manager was removed, optionally set their department to "No Department"
      if (oldManager && oldManager !== "" && (!manager || manager === "")) {
        await Employee.update(
          { department: "No Department" },
          { 
            where: { 
              fullname: oldManager,
              position: "Team Leader"
            } 
          }
        );
      }
    }

    res.status(200).json(department);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: "Department name already exists" });
    }
    console.error("Error updating department:", error);
    res.status(500).json({ error: "Failed to update department" });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    const employeeCount = await Employee.count({
      where: { department: department.name }
    });

    if (employeeCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department. ${employeeCount} employee(s) are assigned to this department.` 
      });
    }

    await department.destroy();
    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ error: "Failed to delete department" });
  }
};
