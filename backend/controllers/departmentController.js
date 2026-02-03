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
        // Count employees in this department
        let employeeCount = await Employee.count({
          where: { department: dept.name }
        });
        
        // If there's a manager assigned, check if they need to be counted
        if (dept.manager) {
          // Check if the manager is already counted (i.e., they're in this department)
          // Try to find manager by exact name match
          let managerInDept = null;
          if (dept.manager) {
            managerInDept = await Employee.findOne({
              where: {
                department: dept.name
              },
              attributes: ['id', 'firstname', 'lastname', 'department']
            });
            
            // Check if any employee in this department matches the manager name
            if (managerInDept) {
              const employees = await Employee.findAll({
                where: { department: dept.name },
                attributes: ['id', 'firstname', 'lastname']
              });
              
              managerInDept = employees.find(emp => {
                const empFullName = emp.firstname && emp.lastname 
                  ? `${emp.firstname} ${emp.lastname}` 
                  : emp.firstname || '';
                return empFullName === dept.manager;
              });
            }
          }
          
          console.log(`🔍 Manager check for ${dept.name}: manager=${dept.manager}, inDept=${!!managerInDept}`);
          
          // If manager is not in this department, add 1 to count
          if (!managerInDept) {
            // Try to find manager by exact name match across all employees
            let managerExists = null;
            if (dept.manager) {
              const allEmployees = await Employee.findAll({
                attributes: ['id', 'firstname', 'lastname']
              });
              
              managerExists = allEmployees.find(emp => {
                const empFullName = emp.firstname && emp.lastname 
                  ? `${emp.firstname} ${emp.lastname}` 
                  : emp.firstname || '';
                return empFullName === dept.manager;
              });
            }
            
            if (managerExists) {
              employeeCount += 1;
              console.log(`✅ Added cross-department manager ${dept.manager} to ${dept.name} count`);
            }
          }
        }
        
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
        // Find the manager using exact name match
        let managerEmployee = null;
        if (manager) {
          const allEmployees = await Employee.findAll({
            where: { position: "Team Leader" },
            attributes: ['id', 'firstname', 'lastname', 'department']
          });
          
          managerEmployee = allEmployees.find(emp => {
            const empFullName = emp.firstname && emp.lastname 
              ? `${emp.firstname} ${emp.lastname}` 
              : emp.firstname || '';
            return empFullName === manager;
          });
        }

        if (managerEmployee) {
          await Employee.update(
            { department: department.name },
            { where: { id: managerEmployee.id } }
          );
          console.log(`✅ Updated manager ${manager} department to ${department.name}`);
        }
      }

      // If old manager was removed, optionally set their department to "No Department"
      if (oldManager && oldManager !== "" && (!manager || manager === "")) {
        let oldManagerEmployee = null;
        if (oldManager) {
          const allEmployees = await Employee.findAll({
            where: { position: "Team Leader" },
            attributes: ['id', 'firstname', 'lastname', 'department']
          });
          
          oldManagerEmployee = allEmployees.find(emp => {
            const empFullName = emp.firstname && emp.lastname 
              ? `${emp.firstname} ${emp.lastname}` 
              : emp.firstname || '';
            return empFullName === oldManager;
          });
        }

        if (oldManagerEmployee) {
          await Employee.update(
            { department: "No Department" },
            { where: { id: oldManagerEmployee.id } }
          );
          console.log(`✅ Removed old manager ${oldManager} from department`);
        }
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
