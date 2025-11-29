import {
  getAllTemplates,
  getTemplatesByDepartment,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../services/scheduleTemplateService.js";

// GET /api/templates
export const getTemplates = async (req, res) => {
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
    const template = await createTemplate(req.body);
    
    // Auto-assign template to team leader of the department
    if (template.department) {
      try {
        const { default: User } = await import("../models/user.js");
        const { default: Employee } = await import("../models/employee.js");
        const { assignScheduleToEmployee } = await import("../services/employeeScheduleService.js");
        
        // Find team leader for this department
        const teamLeaderUser = await User.findOne({
          where: { role: "teamleader" },
          include: [{
            model: Employee,
            as: "employee",
            where: { department: template.department }
          }]
        });
        
        if (teamLeaderUser && teamLeaderUser.employee) {
          // Assign the template to the team leader
          await assignScheduleToEmployee({
            employee_id: teamLeaderUser.employee.employee_id,
            template_id: template.id,
            days: template.days,
            assigned_by: req.body.created_by || "admin"
          });
          
          console.log(`✅ Auto-assigned template to team leader: ${teamLeaderUser.employee.employee_id} (${teamLeaderUser.employee.fullname})`);
        } else {
          console.log(`⚠️ No team leader found for department: ${template.department}`);
        }
      } catch (autoAssignError) {
        console.error("Error auto-assigning to team leader:", autoAssignError);
        // Don't fail template creation if auto-assign fails
      }
    }
    
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating template:", error);
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
    
    // Get template details before deleting
    const template = await getTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Delete all employee assignments for this template (including team leader)
    try {
      const { default: EmployeeSchedule } = await import("../models/employeeSchedule.js");
      
      const deletedAssignments = await EmployeeSchedule.destroy({
        where: { template_id: id }
      });
      
      if (deletedAssignments > 0) {
        console.log(`✅ Deleted ${deletedAssignments} employee assignment(s) for template ${id}`);
      }
    } catch (cascadeError) {
      console.error("Error deleting employee assignments:", cascadeError);
      // Continue with template deletion even if cascade fails
    }
    
    // Delete the template
    const deleted = await deleteTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Error deleting template" });
  }
};
