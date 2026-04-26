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
import { notifyEmployees } from "../services/notificationService.js";

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
    const { department, shift_name, start_time, end_time, specific_date } = req.body;

    // Validate required fields
    if (!department || !shift_name || !start_time || !end_time || !specific_date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Import Employee model
    const { default: Employee } = await import("../models/employee.js");

    // Skip team leader check for Role-Based (supervisor/admin) schedules
    if (department !== 'Role-Based') {
      // Check if department has a team leader
      const teamLeader = await Employee.findOne({
        where: {
          department: department,
          position: 'Team Leader',
          status: 'Active'
        }
      });

      if (!teamLeader) {
        return res.status(400).json({ 
          error: `Cannot schedule ${department}: No active team leader assigned to this zone` 
        });
      }

      // Check if team leader has biometric enrollment
      if (!teamLeader.has_fingerprint) {
        return res.status(400).json({ 
          error: `Cannot schedule ${department}: Team leader ${teamLeader.firstname} ${teamLeader.lastname} has no biometric enrollment` 
        });
      }
    }

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

    // Notify team leaders of the affected department
    if (template.department) {
      try {
        const { notifyTeamLeaders } = await import("../services/notificationService.js");
        const departments = [template.department];
        const createdBy = req.body.created_by || req.user?.username || "Admin";
        const dateInfo = template.specific_date
          ? ` for ${template.specific_date}`
          : template.days?.length ? ` on ${Array.isArray(template.days) ? template.days.join(", ") : template.days}` : "";

        await notifyTeamLeaders(
          departments,
          "New Shift Template Available",
          `A new shift template "${template.shift_name}" (${template.start_time} - ${template.end_time})${dateInfo} has been assigned to ${template.department}. Please review and assign employees.`,
          "schedule_update",
          template.id,
          createdBy,
          io
        );
        console.log(`📢 Notified team leaders in ${template.department} about new template`);
      } catch (notifError) {
        // Don't fail the request if notification fails
        console.error("⚠️ Failed to send team leader notifications:", notifError.message);
      }
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

    // Notify team leaders of the affected department
    if (template.department) {
      try {
        const { notifyTeamLeaders } = await import("../services/notificationService.js");
        const departments = [template.department];
        const updatedBy = req.body.updated_by || req.user?.username || "Admin";
        const dateInfo = template.specific_date
          ? ` for ${template.specific_date}`
          : template.days?.length ? ` on ${Array.isArray(template.days) ? template.days.join(", ") : template.days}` : "";

        await notifyTeamLeaders(
          departments,
          "Shift Template Updated",
          `The shift template "${template.shift_name}" (${template.start_time} - ${template.end_time})${dateInfo} for ${template.department} has been updated. Please review the changes.`,
          "schedule_update",
          template.id,
          updatedBy,
          io
        );
        console.log(`📢 Notified team leaders in ${template.department} about updated template`);
      } catch (notifError) {
        console.error("⚠️ Failed to send team leader notifications:", notifError.message);
      }
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
    
    // Fetch template details BEFORE deleting so we can use them in the notification
    const { default: ScheduleTemplate } = await import("../models/scheduleTemplate.js");
    const template = await ScheduleTemplate.findByPk(id);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Capture details before deletion
    const templateDept = template.department;
    const templateName = template.shift_name;
    const templateStart = template.start_time;
    const templateEnd = template.end_time;
    const templateDate = template.specific_date;
    const templateDays = template.days;
    
    const deleted = await deleteTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('template:deleted', { id });
    }

    // Notify team leaders of the affected department
    if (templateDept) {
      try {
        const { notifyTeamLeaders } = await import("../services/notificationService.js");
        const deletedBy = req.user?.username || "Admin";
        const dateInfo = templateDate
          ? ` for ${templateDate}`
          : templateDays?.length ? ` on ${Array.isArray(templateDays) ? templateDays.join(", ") : templateDays}` : "";

        await notifyTeamLeaders(
          [templateDept],
          "Shift Template Removed",
          `The shift template "${templateName}" (${templateStart} - ${templateEnd})${dateInfo} for ${templateDept} has been removed by ${deletedBy}.`,
          "schedule_update",
          null,
          deletedBy,
          io
        );
        console.log(`📢 Notified team leaders in ${templateDept} about deleted template`);
      } catch (notifError) {
        console.error("⚠️ Failed to send team leader notifications:", notifError.message);
      }
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
    
    const assignedBy = assigned_by || req.user?.username || "System";

    console.log("📤 Assigning employees to template:", { template_id, employee_ids, assigned_by: assignedBy });
    
    const template = await assignEmployeesToTemplate(template_id, employee_ids, assignedBy);
    
    console.log("✅ Employees assigned successfully to template:", template_id);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('employee:assigned', { template_id, employee_ids });
    }

    // Notify each assigned employee
    try {
      const dateInfo = template.specific_date
        ? ` for ${template.specific_date}`
        : template.days?.length ? ` on ${Array.isArray(template.days) ? template.days.join(", ") : template.days}` : "";

      await notifyEmployees(
        employee_ids,
        "New Schedule Assigned",
        `You have been scheduled for "${template.shift_name}" (${template.start_time} - ${template.end_time})${dateInfo} by ${assignedBy}.`,
        "schedule_update",
        template_id,
        assignedBy,
        io
      );
      console.log(`📧 Notified ${employee_ids.length} employee(s) about schedule assignment`);
    } catch (notifError) {
      console.error("⚠️ Failed to send employee notifications:", notifError.message);
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

    // Fetch template details before removing so we can use them in the notification
    const { default: ScheduleTemplate } = await import("../models/scheduleTemplate.js");
    const template = await ScheduleTemplate.findByPk(id);

    console.log("🗑️ Removing employees from template:", { template_id: id, employee_ids });
    
    await removeEmployeesFromTemplate(id, employee_ids);
    
    console.log("✅ Employees removed successfully from template:", id);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('employee:removed', { template_id: id, employee_ids });
    }

    // Notify each removed employee
    if (template) {
      try {
        const removedBy = req.user?.username || "System";
        const dateInfo = template.specific_date
          ? ` for ${template.specific_date}`
          : template.days?.length ? ` on ${Array.isArray(template.days) ? template.days.join(", ") : template.days}` : "";

        await notifyEmployees(
          employee_ids,
          "Schedule Removed",
          `Your schedule for "${template.shift_name}" (${template.start_time} - ${template.end_time})${dateInfo} has been removed by ${removedBy}.`,
          "sched_delete",
          null,
          removedBy,
          io
        );
        console.log(`📧 Notified ${employee_ids.length} employee(s) about schedule removal`);
      } catch (notifError) {
        console.error("⚠️ Failed to send employee notifications:", notifError.message);
      }
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