import {
  getAllTemplates,
  getTemplatesByDepartment,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../services/scheduleTemplateService.js";

// GET /api/templates - Returns ALL templates (for admin)
export const getTemplates = async (req, res) => {
  try {
    // Admin gets all templates (draft and published)
    const templates = await getAllTemplates(false);
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Error fetching templates" });
  }
};

// GET /api/templates/published - Returns ONLY published templates (for ViewSchedules)
export const getPublishedTemplates = async (req, res) => {
  try {
    // Only return published templates
    const templates = await getAllTemplates(true);
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching published templates:", error);
    res.status(500).json({ message: "Error fetching published templates" });
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
    
    // DON'T delete employee assignments yet - only mark template for deletion
    // Employee assignments will be deleted when admin clicks "Publish Schedule"
    // This allows team leaders to keep their assignments until admin confirms
    
    // Mark the template for deletion (sets pending_deletion = true)
    const deleted = await deleteTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.status(200).json({ message: "Template marked for deletion. Click 'Publish Schedule' to apply changes." });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Error deleting template" });
  }
};


// POST /api/templates/publish
export const publishSchedules = async (req, res) => {
  try {
    const { published_by } = req.body;
    const { default: ScheduleTemplate } = await import("../models/scheduleTemplate.js");
    const { permanentlyDeleteTemplate } = await import("../services/scheduleTemplateService.js");
    const { notifyTeamLeaders } = await import("../services/notificationService.js");
    const { Op } = await import("sequelize");
    
    console.log("📤 Publishing schedule changes...");
    
    // Step 1: Handle pending deletions
    const pendingDeletions = await ScheduleTemplate.findAll({
      where: {
        pending_deletion: true
      }
    });
    
    console.log(`🗑️  Found ${pendingDeletions.length} schedule(s) pending deletion`);
    
    const deletedDepartments = [];
    if (pendingDeletions.length > 0) {
      // First, delete all employee assignments for these templates
      const { default: EmployeeSchedule } = await import("../models/employeeSchedule.js");
      
      for (const template of pendingDeletions) {
        deletedDepartments.push(template.department);
        
        // Delete employee assignments for this template
        try {
          const deletedAssignments = await EmployeeSchedule.destroy({
            where: { template_id: template.id }
          });
          
          if (deletedAssignments > 0) {
            console.log(`   Removed ${deletedAssignments} employee assignment(s) for ${template.department}`);
          }
        } catch (assignmentError) {
          console.error(`   Error deleting assignments for template ${template.id}:`, assignmentError);
        }
        
        // Then permanently delete the template
        await permanentlyDeleteTemplate(template.id);
        console.log(`   Deleted: ${template.department} - ${template.shift_name}`);
      }
    }
    
    // Step 2: Publish draft schedules (not pending deletion)
    const [updatedCount] = await ScheduleTemplate.update(
      {
        publish_status: "Published",
        published_at: new Date(),
        published_by: published_by || "admin"
      },
      {
        where: {
          publish_status: "Draft",
          pending_deletion: false
        }
      }
    );
    
    console.log(`📊 Published ${updatedCount} new/updated schedule(s)`);
    
    // Step 3: Get all recently published templates
    const publishedTemplates = await ScheduleTemplate.findAll({
      where: {
        published_at: {
          [Op.gte]: new Date(Date.now() - 5000) // Last 5 seconds
        },
        pending_deletion: false
      }
    });
    
    console.log(`📋 Found ${publishedTemplates.length} recently published template(s)`);
    
    // Step 4: Collect all affected departments
    const publishedDepartments = [...new Set(publishedTemplates.map(t => t.department))];
    const allAffectedDepartments = [...new Set([...publishedDepartments, ...deletedDepartments])];
    
    console.log(`🏢 Departments affected: ${allAffectedDepartments.join(', ')}`);
    
    // Step 5: Send notifications to team leaders
    if (allAffectedDepartments.length > 0) {
      try {
        let message = "";
        if (updatedCount > 0 && pendingDeletions.length > 0) {
          message = `Schedule changes have been published for your department by ${published_by || "Admin"}. ${updatedCount} schedule(s) added/updated and ${pendingDeletions.length} schedule(s) removed. Please review the updated schedule.`;
        } else if (updatedCount > 0) {
          message = `${updatedCount} new schedule(s) have been published for your department by ${published_by || "Admin"}. Please review the updated schedule.`;
        } else if (pendingDeletions.length > 0) {
          message = `${pendingDeletions.length} schedule(s) have been removed from your department by ${published_by || "Admin"}. Please review the updated schedule.`;
        }
        
        await notifyTeamLeaders(
          allAffectedDepartments,
          "Schedule Updated",
          message,
          "schedule_published",
          null,
          published_by || "admin"
        );
        console.log("✅ Notifications sent successfully");
      } catch (notifyError) {
        console.error("❌ Error sending notifications:", notifyError);
        // Don't fail the publish if notifications fail
      }
    }
    
    const totalChanges = updatedCount + pendingDeletions.length;
    
    if (totalChanges === 0) {
      return res.status(200).json({ 
        message: "No changes to publish",
        count: 0,
        published: 0,
        deleted: 0
      });
    }
    
    res.status(200).json({ 
      message: `Successfully published ${totalChanges} change(s)`,
      count: totalChanges,
      published: updatedCount,
      deleted: pendingDeletions.length,
      departments: allAffectedDepartments,
      templates: publishedTemplates
    });
  } catch (error) {
    console.error("Error publishing schedules:", error);
    res.status(500).json({ message: "Error publishing schedules" });
  }
};
