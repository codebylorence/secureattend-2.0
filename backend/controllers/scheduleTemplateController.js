import {
  getAllTemplates,
  getTemplatesByDepartment,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  assignEmployeesToTemplate,
  removeEmployeesFromTemplate,
  getEmployeeSchedulesFromTemplates,
} from "../services/scheduleTemplateService.js";

// GET /api/templates - Returns ALL active templates
export const getTemplates = async (req, res) => {
  try {
    const templates = await getAllTemplates();
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Error fetching templates" });
  }
};

// GET /api/templates/published - Returns ALL active templates (same as getTemplates for backward compatibility)
export const getPublishedTemplates = async (req, res) => {
  try {
    const templates = await getAllTemplates();
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Error fetching templates" });
  }
};

// GET /api/templates/department/:department
export const getDepartmentTemplates = async (req, res) => {
  try {
    const { department } = req.params;
    const templates = await getTemplatesByDepartment(department);
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching department templates:", error);
    res.status(500).json({ message: "Error fetching department templates" });
  }
};

// GET /api/templates/:id
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await getTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ message: "Error fetching template" });
  }
};

// POST /api/templates
export const addTemplate = async (req, res) => {
  try {
    console.log("📝 Creating template with data:", {
      department: req.body.department,
      shift_name: req.body.shift_name,
      specific_date: req.body.specific_date,
      created_by: req.body.created_by
    });
    
    const template = await createTemplate(req.body);
    
    console.log("✅ Template created successfully:", {
      id: template.id,
      department: template.department,
      shift_name: template.shift_name,
      assigned_employees: template.assigned_employees ? 'Has assignments' : 'No assignments yet'
    });
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('template:created', template);
    }
    
    res.status(201).json(template);
  } catch (error) {
    console.error("❌ Error creating template:", error);
    res.status(500).json({ message: "Error creating template" });
  }
};

// PUT /api/templates/:id
export const editTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await updateTemplate(id, req.body);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('template:updated', template);
    }
    
    res.status(200).json({ message: "Template updated successfully", template });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ message: "Error updating template" });
  }
};

// DELETE /api/templates/:id
export const removeTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await deleteTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('template:deleted', { id });
    }
    
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Error deleting template" });
  }
};

// GET /api/templates/stats - Get template statistics
export const getTemplateStats = async (req, res) => {
  try {
    const { default: ScheduleTemplate } = await import("../models/scheduleTemplate.js");
    
    const stats = await ScheduleTemplate.findAll({
      attributes: [
        'status',
        [ScheduleTemplate.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status']
    });
    
    // Process stats into a more readable format
    const processedStats = {
      active: 0,
      inactive: 0,
      total: 0
    };
    
    stats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      processedStats.total += count;
      
      if (stat.status === "Active") {
        processedStats.active += count;
      } else {
        processedStats.inactive += count;
      }
    });
    
    res.status(200).json(processedStats);
  } catch (error) {
    console.error("Error fetching template stats:", error);
    res.status(500).json({ message: "Error fetching template stats" });
  }
};

// POST /api/templates/assign-employees - Assign employees to a template
export const assignEmployees = async (req, res) => {
  try {
    const { template_id, employee_ids, assigned_by } = req.body;
    
    if (!template_id || !employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({ 
        message: "template_id and employee_ids array are required" 
      });
    }
    
    console.log("📤 Assigning employees to template:", {
      template_id,
      employee_ids,
      assigned_by: assigned_by || req.user?.username || "System"
    });
    
    const template = await assignEmployeesToTemplate(
      template_id, 
      employee_ids, 
      assigned_by || req.user?.username || "System"
    );
    
    console.log("✅ Employees assigned successfully to template:", template_id);
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('employee:assigned', { template_id, employee_ids });
    }
    
    res.status(200).json({ 
      message: "Employees assigned successfully",
      template_id,
      employee_ids,
      assigned_count: employee_ids.length
    });
  } catch (error) {
    console.error("❌ Error assigning employees to template:", error);
    res.status(500).json({ 
      message: "Error assigning employees to template",
      error: error.message 
    });
  }
};

// DELETE /api/templates/:id/employees - Remove employees from a template
export const removeEmployees = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_ids } = req.body;
    
    if (!employee_ids || !Array.isArray(employee_ids)) {
      return res.status(400).json({ 
        message: "employee_ids array is required" 
      });
    }
    
    console.log("🗑️ Removing employees from template:", {
      template_id: id,
      employee_ids
    });
    
    const template = await removeEmployeesFromTemplate(id, employee_ids);
    
    console.log("✅ Employees removed successfully from template:", id);
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('employee:removed', { template_id: id, employee_ids });
    }
    
    res.status(200).json({ 
      message: "Employees removed successfully",
      template_id: id,
      employee_ids,
      removed_count: employee_ids.length
    });
  } catch (error) {
    console.error("❌ Error removing employees from template:", error);
    res.status(500).json({ 
      message: "Error removing employees from template",
      error: error.message 
    });
  }
};

// GET /api/schedules/biometric - Get schedules formatted for biometric app
export const getBiometricSchedules = async (req, res) => {
  try {
    console.log("📱 Biometric app requesting schedules...");
    
    const { default: ScheduleTemplate } = await import("../models/scheduleTemplate.js");
    const { default: Employee } = await import("../models/employee.js");
    const { Op } = await import("sequelize");
    
    // Get all active templates with assigned employees
    const templates = await ScheduleTemplate.findAll({
      where: { 
        status: "Active",
        assigned_employees: { [Op.ne]: null }
      },
      order: [["specific_date", "ASC"], ["createdAt", "DESC"]],
    });
    
    const biometricSchedules = [];
    
    for (const template of templates) {
      let assignedEmployees = [];
      try {
        assignedEmployees = template.assigned_employees ? JSON.parse(template.assigned_employees) : [];
      } catch (e) {
        console.warn(`⚠️ Failed to parse assigned_employees for template ${template.id}`);
        continue;
      }
      
      // Get employee details for each assigned employee
      for (const empAssignment of assignedEmployees) {
        try {
          const employee = await Employee.findOne({
            where: { employee_id: empAssignment.employee_id, status: "Active" }
          });
          
          if (employee) {
            biometricSchedules.push({
              Id: parseInt(`${template.id}${employee.id}`), // Unique ID for biometric app
              Employee_Id: employee.employee_id,
              Template_Id: template.id,
              Shift_Name: template.shift_name,
              Start_Time: template.start_time,
              End_Time: template.end_time,
              Days: template.days || [],
              Specific_Date: template.specific_date,
              Department: template.department,
              Employee_Name: employee.fullname || `Employee ${employee.employee_id}`,
              Assigned_By: empAssignment.assigned_by,
              Assigned_Date: empAssignment.assigned_date,
              Created_At: template.createdAt,
              Updated_At: template.updatedAt
            });
          } else {
            console.warn(`⚠️ Employee ${empAssignment.employee_id} not found or inactive - skipping schedule assignment`);
          }
        } catch (empError) {
          console.warn(`⚠️ Failed to get employee details for ${empAssignment.employee_id}:`, empError.message);
        }
      }
    }
    
    console.log(`✅ Retrieved ${biometricSchedules.length} schedule(s) for biometric app`);
    res.status(200).json(biometricSchedules);
  } catch (error) {
    console.error("❌ Error fetching biometric schedules:", error);
    res.status(500).json({ 
      message: "Error fetching schedules for biometric app",
      error: error.message 
    });
  }
};

// GET /api/templates/employee/:employeeId - Get schedules for a specific employee
export const getEmployeeSchedules = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`📅 Fetching schedules for employee: ${employeeId}`);
    
    const schedules = await getEmployeeSchedulesFromTemplates(employeeId);
    
    console.log(`✅ Found ${schedules.length} schedule(s) for employee ${employeeId}`);
    res.status(200).json(schedules);
  } catch (error) {
    console.error("❌ Error fetching employee schedules:", error);
    res.status(500).json({ 
      message: "Error fetching employee schedules",
      error: error.message 
    });
  }
};