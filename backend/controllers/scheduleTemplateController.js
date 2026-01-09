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
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('template:created', template);
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
    const oldTemplate = await getTemplateById(id);
    
    if (!oldTemplate) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check if we're editing a published schedule
    const isEditingPublished = oldTemplate.publish_status === "Published";
    
    let template;
    
    if (isEditingPublished) {
      // When editing a published schedule, create a new draft with edited status
      console.log(`📝 Creating edited draft for published template ${id} (${oldTemplate.department})`);
      
      const { createTemplate } = await import("../services/scheduleTemplateService.js");
      
      // Create a new draft template with edited status
      const editedTemplateData = {
        ...oldTemplate.dataValues, // Start with all original template data
        ...req.body, // Override with edited fields
        id: undefined, // Let database generate new ID
        department: oldTemplate.department, // Ensure department is preserved
        days: oldTemplate.days, // Ensure days array is preserved
        publish_status: "Draft",
        is_edited: true,
        original_template_id: oldTemplate.id,
        edited_at: new Date(),
        edited_by: req.body.edited_by || "admin",
        created_by: oldTemplate.created_by,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      template = await createTemplate(editedTemplateData);
      console.log(`✅ Created edited draft template ${template.id}`);
      
    } else {
      // If it's already a draft, just update it normally
      console.log(`📝 Updating existing draft template ${id}`);
      
      // Add edited status fields if not already set
      const updateData = {
        ...req.body,
        edited_at: new Date(),
        edited_by: req.body.edited_by || "admin"
      };
      
      // If this draft doesn't have edited status but is editing a published schedule, set it
      if (!oldTemplate.is_edited && !oldTemplate.original_template_id) {
        const { getAllTemplates } = await import("../services/scheduleTemplateService.js");
        const allTemplates = await getAllTemplates(false);
        
        // Check if there's a published version of this department
        const publishedVersion = allTemplates.find(t => 
          t.department === oldTemplate.department &&
          t.publish_status === "Published" &&
          t.days.some(d => oldTemplate.days.includes(d)) &&
          t.id !== oldTemplate.id &&
          !t.pending_deletion
        );
        
        if (publishedVersion) {
          updateData.is_edited = true;
          updateData.original_template_id = publishedVersion.id;
        }
      }
      
      template = await updateTemplate(id, updateData);
    }
    
    // Send notification to team leader about the schedule change
    // Only notify if the original template was published (team leaders could see it)
    if (isEditingPublished) {
      try {
        const { notifyMultipleRoles } = await import("../services/notificationService.js");
        
        console.log(`📝 Checking for changes in template ${template.id} (${template.department})`);
        console.log(`Old template:`, {
          shift_name: oldTemplate.shift_name,
          start_time: oldTemplate.start_time,
          end_time: oldTemplate.end_time,
          day_limits: oldTemplate.day_limits,
          member_limit: oldTemplate.member_limit
        });
        console.log(`New data:`, req.body);
        
        // Build change message with natural language
        let changes = [];
        
        // Check if shift changed
        if (req.body.shift_name && req.body.shift_name !== oldTemplate.shift_name) {
          changes.push(`Shift changed from ${oldTemplate.shift_name} to ${req.body.shift_name}`);
          console.log(`  ✏️ Shift changed: ${oldTemplate.shift_name} → ${req.body.shift_name}`);
        }
        
        // Check if time changed
        if (req.body.start_time && req.body.start_time !== oldTemplate.start_time) {
          changes.push(`Start time updated from ${oldTemplate.start_time} to ${req.body.start_time}`);
          console.log(`  ✏️ Start time changed: ${oldTemplate.start_time} → ${req.body.start_time}`);
        }
        if (req.body.end_time && req.body.end_time !== oldTemplate.end_time) {
          changes.push(`End time updated from ${oldTemplate.end_time} to ${req.body.end_time}`);
          console.log(`  ✏️ End time changed: ${oldTemplate.end_time} → ${req.body.end_time}`);
        }
        
        // Check if day limits changed
        if (req.body.day_limits) {
          for (const [day, limit] of Object.entries(req.body.day_limits)) {
            const oldLimit = oldTemplate.day_limits?.[day] || oldTemplate.member_limit;
            if (limit !== oldLimit) {
              changes.push(`${day} member limit updated from ${oldLimit} to ${limit}`);
              console.log(`  ✏️ ${day} limit changed: ${oldLimit} → ${limit}`);
            }
          }
        }
        
        console.log(`📊 Total changes detected: ${changes.length}`);
        
        // Only send notification if there are actual changes
        if (changes.length > 0) {
          const message = changes.join('\n');
          
          console.log(`📧 Sending notification to multiple roles in ${template.department}...`);
          await notifyMultipleRoles(
            ["teamleader", "supervisor", "employee"], // Notify team leaders, supervisors, and employees
            [template.department],
            "Schedule Modified",
            message,
            "schedule_update",
            null,
            "admin"
          );
          console.log(`✅ Notification sent successfully`);
        } else {
          console.log(`ℹ️ No changes detected, skipping notification`);
        }
      } catch (notifyError) {
        console.error("❌ Error sending notification:", notifyError);
        console.error("❌ Error stack:", notifyError.stack);
        // Don't fail the update if notification fails
      }
    } else {
      console.log(`ℹ️ Template is not published (status: ${oldTemplate.publish_status}), skipping notification`);
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
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('template:deleted', { id });
    }
    
    res.status(200).json({ message: "Template marked for deletion. Click 'Publish Schedule' to apply changes." });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Error deleting template" });
  }
};

// DELETE /api/templates/:id/permanent
export const permanentlyRemoveTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get template details before deleting
    const template = await getTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Permanently delete the template (for drafts)
    const { permanentlyDeleteTemplate } = await import("../services/scheduleTemplateService.js");
    const deleted = await permanentlyDeleteTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('template:deleted', { id });
    }
    
    res.status(200).json({ message: "Template permanently deleted" });
  } catch (error) {
    console.error("Error permanently deleting template:", error);
    res.status(500).json({ message: "Error permanently deleting template" });
  }
};


// POST /api/templates/publish
export const publishSchedules = async (req, res) => {
  try {
    console.log("📤 Starting publishSchedules...");
    const { published_by } = req.body;
    console.log("Published by:", published_by);
    
    const { default: ScheduleTemplate } = await import("../models/scheduleTemplate.js");
    const { permanentlyDeleteTemplate } = await import("../services/scheduleTemplateService.js");
    const { notifyMultipleRoles } = await import("../services/notificationService.js");
    const { Op } = await import("sequelize");
    const io = req.app.get('io');
    
    console.log("📤 Publishing schedule changes...");
    
    // Step 1: Handle pending deletions
    const pendingDeletions = await ScheduleTemplate.findAll({
      where: {
        pending_deletion: true
      }
    });
    
    console.log(`🗑️  Found ${pendingDeletions.length} schedule(s) pending deletion`);
    
    // Track deletions with team leader assignment info for notifications
    const deletionsWithAssignments = [];
    
    if (pendingDeletions.length > 0) {
      // First, check which employees were assigned before deleting
      const { default: EmployeeSchedule } = await import("../models/employeeSchedule.js");
      
      for (const template of pendingDeletions) {
        console.log(`   Checking assignments for template ${template.id} (${template.department} - ${template.shift_name})`);
        
        // Find all assignments for this template (we'll filter for team leaders later)
        try {
          const assignments = await EmployeeSchedule.findAll({
            where: { template_id: template.id }
          });
          
          console.log(`     Found ${assignments.length} assignment(s)`);
          
          if (assignments.length > 0) {
            assignments.forEach(assignment => {
              console.log(`       Employee ${assignment.employee_id} assigned to days: ${assignment.days.join(',')}`);
              deletionsWithAssignments.push({
                department: template.department,
                shift_name: template.shift_name,
                start_time: template.start_time,
                end_time: template.end_time,
                days: assignment.days, // Days the employee was assigned
                employeeId: assignment.employee_id
              });
            });
          } else {
            console.log(`     No assignments found for this template`);
          }
        } catch (findError) {
          console.error(`   Error finding assignments for template ${template.id}:`, findError);
        }
        
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
    
    // Step 2: Handle edited templates and other draft templates
    // Find all draft templates
    const draftTemplates = await ScheduleTemplate.findAll({
      where: {
        publish_status: "Draft",
        pending_deletion: false
      }
    });
    
    console.log(`📝 Found ${draftTemplates.length} draft template(s) to publish`);
    
    // Track replacements for notifications (old -> new)
    const replacements = [];
    
    let replacedCount = 0;
    for (const draft of draftTemplates) {
      // Handle edited templates first (they have original_template_id)
      if (draft.is_edited && draft.original_template_id) {
        console.log(`  ✏️ Processing edited template ${draft.id} (original: ${draft.original_template_id})`);
        
        // Find the original published template
        const originalTemplate = await ScheduleTemplate.findByPk(draft.original_template_id);
        
        if (originalTemplate && originalTemplate.publish_status === "Published") {
          console.log(`  🔄 Edited draft ${draft.id} replaces original ${originalTemplate.id} for ${draft.department}`);
          console.log(`     New: ${draft.shift_name} (${draft.days.join(', ')})`);
          console.log(`     Original: ${originalTemplate.shift_name} (${originalTemplate.days.join(', ')})`);
          
          // Store replacement info for notifications
          replacements.push({
            department: draft.department,
            oldShift: originalTemplate.shift_name,
            newShift: draft.shift_name,
            oldTime: `${originalTemplate.start_time} - ${originalTemplate.end_time}`,
            newTime: `${draft.start_time} - ${draft.end_time}`,
            days: draft.days,
            isEdited: true
          });
          
          // Delete employee assignments for the original template
          const { default: EmployeeSchedule } = await import("../models/employeeSchedule.js");
          const deletedAssignments = await EmployeeSchedule.destroy({
            where: { template_id: originalTemplate.id }
          });
          
          if (deletedAssignments > 0) {
            console.log(`     Removed ${deletedAssignments} employee assignment(s) from original template`);
          }
          
          // Clear the foreign key reference in the edited template before deleting the original
          await draft.update({ 
            original_template_id: null,
            is_edited: false // Will be set to false again in Step 3, but doing it here for clarity
          });
          
          // Now delete the original published template
          await permanentlyDeleteTemplate(originalTemplate.id);
          replacedCount++;
          
          console.log(`     ✅ Deleted original published version: ${originalTemplate.shift_name}`);
        }
      } else {
        // Handle non-edited drafts (legacy logic for backward compatibility)
        const publishedVersions = await ScheduleTemplate.findAll({
          where: {
            department: draft.department,
            publish_status: "Published",
            pending_deletion: false,
            id: { [Op.ne]: draft.id } // Not the same template
          }
        });
        
        for (const publishedVersion of publishedVersions) {
          // Check if they have overlapping days
          const hasOverlap = draft.days.some(day => publishedVersion.days.includes(day));
          
          if (hasOverlap) {
            console.log(`  🔄 Draft ${draft.id} replaces published ${publishedVersion.id} for ${draft.department}`);
            console.log(`     Draft: ${draft.shift_name} (${draft.days.join(', ')})`);
            console.log(`     Published: ${publishedVersion.shift_name} (${publishedVersion.days.join(', ')})`);
            
            // Store replacement info for notifications
            replacements.push({
              department: draft.department,
              oldShift: publishedVersion.shift_name,
              newShift: draft.shift_name,
              oldTime: `${publishedVersion.start_time} - ${publishedVersion.end_time}`,
              newTime: `${draft.start_time} - ${draft.end_time}`,
              days: draft.days.filter(day => publishedVersion.days.includes(day)),
              isEdited: false
            });
            
            // Delete employee assignments for the old published template
            const { default: EmployeeSchedule } = await import("../models/employeeSchedule.js");
            const deletedAssignments = await EmployeeSchedule.destroy({
              where: { template_id: publishedVersion.id }
            });
            
            if (deletedAssignments > 0) {
              console.log(`     Removed ${deletedAssignments} employee assignment(s) from old template`);
            }
            
            // Delete the old published template
            await permanentlyDeleteTemplate(publishedVersion.id);
            replacedCount++;
            
            console.log(`     ✅ Deleted old published version: ${publishedVersion.shift_name}`);
          }
        }
      }
    }
    
    if (replacedCount > 0) {
      console.log(`✅ Replaced ${replacedCount} published template(s) with draft versions`);
    }
    
    // Step 3: Publish all draft schedules and clear edited status
    const [updatedCount] = await ScheduleTemplate.update(
      {
        publish_status: "Published",
        published_at: new Date(),
        published_by: published_by || "admin",
        is_edited: false, // Clear edited status when publishing
        original_template_id: null // Clear reference to original template
      },
      {
        where: {
          publish_status: "Draft",
          pending_deletion: false
        }
      }
    );
    
    console.log(`📊 Published ${updatedCount} new/updated schedule(s)`);
    
    // Step 2.5: Auto-assign team leaders to newly published schedules
    console.log(`\n🔍 Checking if team leader auto-assignment is needed (updatedCount: ${updatedCount})...`);
    
    if (updatedCount > 0) {
      try {
        const { default: User } = await import("../models/user.js");
        const { default: Employee } = await import("../models/employee.js");
        const { default: EmployeeSchedule } = await import("../models/employeeSchedule.js");
        
        console.log(`📦 Models imported successfully`);
        
        // Get newly published templates
        const newlyPublishedTemplates = await ScheduleTemplate.findAll({
          where: {
            published_at: {
              [Op.gte]: new Date(Date.now() - 5000) // Last 5 seconds
            },
            pending_deletion: false
          }
        });
        
        console.log(`👥 Found ${newlyPublishedTemplates.length} newly published template(s) to auto-assign team leaders...`);
        
        if (newlyPublishedTemplates.length === 0) {
          console.log(`⚠️  No newly published templates found in the last 5 seconds`);
        }
        
        for (const template of newlyPublishedTemplates) {
          console.log(`\n   Processing: ${template.department} - ${template.shift_name} (ID: ${template.id})`);
          
          try {
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
              console.log(`   Found team leader: ${teamLeaderUser.employee.fullname} (${teamLeaderUser.employee.employee_id})`);
              
              // Check if team leader is already assigned to this template
              const existingAssignment = await EmployeeSchedule.findOne({
                where: {
                  employee_id: teamLeaderUser.employee.employee_id,
                  template_id: template.id
                }
              });
              
              if (!existingAssignment) {
                console.log(`   Creating assignment...`);
                
                // Generate schedule dates for the team leader
                const { generateScheduleDates } = await import("../utils/scheduleDateGenerator.js");
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 6);
                
                const scheduleDates = generateScheduleDates(template.days, today, nextWeek);
                
                // Create assignment for team leader with schedule dates
                const newAssignment = await EmployeeSchedule.create({
                  employee_id: teamLeaderUser.employee.employee_id,
                  template_id: template.id,
                  days: template.days,
                  schedule_dates: scheduleDates,
                  start_date: today,
                  end_date: nextWeek,
                  assigned_by: published_by || "admin"
                });
                
                console.log(`   ✅ Assigned team leader: ${teamLeaderUser.employee.fullname} to ${template.department} - ${template.shift_name} (Assignment ID: ${newAssignment.id})`);
              } else {
                console.log(`   ℹ️  Team leader already assigned: ${teamLeaderUser.employee.fullname} (Assignment ID: ${existingAssignment.id})`);
              }
            } else {
              console.log(`   ⚠️  No team leader found for department: ${template.department}`);
            }
          } catch (assignError) {
            console.error(`   ❌ Error assigning team leader for ${template.department}:`, assignError);
            console.error(`   Error details:`, assignError.message);
            console.error(`   Stack:`, assignError.stack);
          }
        }
        
        console.log(`\n✅ Team leader auto-assignment process completed\n`);
      } catch (importError) {
        console.error(`❌ Error importing models for team leader assignment:`, importError);
      }
    } else {
      console.log(`ℹ️  No new schedules published, skipping team leader auto-assignment\n`);
    }
    
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
    
    // Step 4: Group changes by department for specific notifications
    const departmentChanges = {};
    
    // Track published schedules by department
    publishedTemplates.forEach(template => {
      if (!departmentChanges[template.department]) {
        departmentChanges[template.department] = {
          added: [],
          deleted: []
        };
      }
      departmentChanges[template.department].added.push({
        shift_name: template.shift_name,
        start_time: template.start_time,
        end_time: template.end_time,
        days: template.days
      });
    });
    
    // Track deleted schedules by department
    pendingDeletions.forEach(template => {
      if (!departmentChanges[template.department]) {
        departmentChanges[template.department] = {
          added: [],
          deleted: []
        };
      }
      departmentChanges[template.department].deleted.push({
        shift_name: template.shift_name,
        start_time: template.start_time,
        end_time: template.end_time,
        days: template.days
      });
    });
    
    console.log(`🏢 Departments affected: ${Object.keys(departmentChanges).join(', ')}`);
    
    // Step 4.5: Send deletion notifications to team leaders in affected departments
    console.log(`📧 Checking deletion notifications...`);
    console.log(`   pendingDeletions length: ${pendingDeletions.length}`);
    
    if (pendingDeletions.length > 0) {
      try {
        // Group deletions by department
        const deletionsByDepartment = {};
        pendingDeletions.forEach(template => {
          if (!deletionsByDepartment[template.department]) {
            deletionsByDepartment[template.department] = [];
          }
          deletionsByDepartment[template.department].push({
            shift_name: template.shift_name,
            start_time: template.start_time,
            end_time: template.end_time,
            days: template.days
          });
        });
        
        console.log(`   Departments with deletions:`, Object.keys(deletionsByDepartment));
        
        // Send notification to team leaders in each affected department
        for (const [department, deletions] of Object.entries(deletionsByDepartment)) {
          // Build deletion message
          let message = '';
          deletions.forEach(deletion => {
            deletion.days.forEach(day => {
              message += `${deletion.shift_name} (${deletion.start_time} - ${deletion.end_time}) on ${day} has been deleted\n`;
            });
          });
          
          if (message) {
            await notifyMultipleRoles(
              ["teamleader", "supervisor", "employee"],
              [department],
              "Schedule Deleted",
              message.trim(),
              "sched_delete",
              null,
              published_by || "admin"
            );
            console.log(`✅ Deletion notification sent to multiple roles in ${department}`);
          }
        }
      } catch (deleteNotifyError) {
        console.error("❌ Error sending deletion notifications:", deleteNotifyError);
        // Don't fail the publish if notifications fail
      }
    }
    
    // Step 5: Send specific notifications to team leaders ONLY if they're assigned to affected days
    if (Object.keys(departmentChanges).length > 0) {
      try {
        const { default: User } = await import("../models/user.js");
        const { default: Employee } = await import("../models/employee.js");
        const { default: EmployeeSchedule } = await import("../models/employeeSchedule.js");
        
        for (const [department, changes] of Object.entries(departmentChanges)) {
          // Find the team leader for this department
          const teamLeaderUser = await User.findOne({
            where: { role: "teamleader" },
            include: [{
              model: Employee,
              as: "employee",
              where: { department: department }
            }]
          });
          
          if (!teamLeaderUser || !teamLeaderUser.employee) {
            console.log(`⚠️  No team leader found for ${department}, skipping notification`);
            continue;
          }
          
          // Get all days affected by changes
          const affectedDays = new Set();
          changes.added.forEach(schedule => schedule.days.forEach(day => affectedDays.add(day)));
          changes.deleted.forEach(schedule => schedule.days.forEach(day => affectedDays.add(day)));
          
          // Check if team leader is assigned to work on any of the affected days
          const teamLeaderSchedules = await EmployeeSchedule.findAll({
            where: {
              employee_id: teamLeaderUser.employee.employee_id
            },
            include: [{
              model: ScheduleTemplate,
              as: 'template',
              where: {
                department: department,
                publish_status: "Published"
              }
            }]
          });
          
          // Find which affected days the team leader is actually scheduled for
          const scheduledAffectedDays = [];
          teamLeaderSchedules.forEach(schedule => {
            schedule.days.forEach(day => {
              if (affectedDays.has(day)) {
                scheduledAffectedDays.push(day);
              }
            });
          });
          
          // Only notify if team leader is scheduled on at least one affected day
          if (scheduledAffectedDays.length === 0) {
            console.log(`ℹ️  Team leader for ${department} not scheduled on affected days, skipping notification`);
            continue;
          }
          
          console.log(`📧 Team leader for ${department} IS scheduled on: ${scheduledAffectedDays.join(', ')}`);
          
          // Build natural message showing what changed
          let message = '';
          
          // Find replacements for this department
          const deptReplacements = replacements.filter(r => r.department === department);
          
          if (deptReplacements.length > 0) {
            // Show schedule updates (old -> new)
            deptReplacements.forEach(replacement => {
              const relevantDays = replacement.days.filter(day => scheduledAffectedDays.includes(day));
              if (relevantDays.length > 0) {
                relevantDays.forEach(day => {
                  // Check if shift name or time changed
                  if (replacement.oldShift !== replacement.newShift) {
                    message += `Your schedule on ${day} updated from ${replacement.oldShift} to ${replacement.newShift}\n`;
                  } else if (replacement.oldTime !== replacement.newTime) {
                    message += `Your ${replacement.newShift} on ${day} time changed from ${replacement.oldTime} to ${replacement.newTime}\n`;
                  } else {
                    message += `Your ${replacement.newShift} on ${day} has been updated\n`;
                  }
                });
              }
            });
          }
          
          // If no replacements found, check for new additions or deletions
          if (message === '') {
            // Check for new schedules added
            if (changes.added.length > 0) {
              const relevantAdded = changes.added.filter(schedule => 
                schedule.days.some(day => scheduledAffectedDays.includes(day))
              );
              relevantAdded.forEach(schedule => {
                const relevantDays = schedule.days.filter(day => scheduledAffectedDays.includes(day));
                relevantDays.forEach(day => {
                  message += `New schedule added: ${schedule.shift_name} (${schedule.start_time} - ${schedule.end_time}) on ${day}\n`;
                });
              });
            }
            
            // Note: Deletions are handled separately in Step 4.5
          }
          
          // Send notification to multiple roles in this specific department
          await notifyMultipleRoles(
            ["teamleader", "supervisor", "employee"],
            [department],
            "Your Schedule Updated",
            message.trim(),
            "schedule_published",
            null,
            published_by || "admin"
          );
          
          console.log(`✅ Notification sent to multiple roles in ${department}`);
        }
      } catch (notifyError) {
        console.error("❌ Error sending notifications:", notifyError);
        // Don't fail the publish if notifications fail
      }
    }
    
    const totalChanges = updatedCount + pendingDeletions.length;
    const affectedDepartments = Object.keys(departmentChanges);
    
    if (totalChanges === 0) {
      return res.status(200).json({ 
        message: "No changes to publish",
        count: 0,
        published: 0,
        deleted: 0
      });
    }
    
    // Emit real-time update
    if (io) {
      io.emit('schedules:published', {
        count: totalChanges,
        published: updatedCount,
        deleted: pendingDeletions.length,
        departments: affectedDepartments,
        templates: publishedTemplates
      });
      console.log('🔌 Real-time update sent to all clients');
    }
    
    res.status(200).json({ 
      message: `Successfully published ${totalChanges} change(s)`,
      count: totalChanges,
      published: updatedCount,
      deleted: pendingDeletions.length,
      departments: affectedDepartments,
      templates: publishedTemplates
    });
  } catch (error) {
    console.error("❌ Error publishing schedules:", error);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      message: "Error publishing schedules",
      error: error.message 
    });
  }
};
// GET /api/templates/stats - Get template statistics
export const getTemplateStats = async (req, res) => {
  try {
    const { default: ScheduleTemplate } = await import("../models/scheduleTemplate.js");
    
    const stats = await ScheduleTemplate.findAll({
      attributes: [
        'publish_status',
        'is_edited',
        'pending_deletion',
        [ScheduleTemplate.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['publish_status', 'is_edited', 'pending_deletion']
    });
    
    // Process stats into a more readable format
    const processedStats = {
      published: 0,
      draft: 0,
      edited: 0,
      deleted: 0,
      total: 0
    };
    
    stats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      processedStats.total += count;
      
      if (stat.pending_deletion) {
        processedStats.deleted += count;
      } else if (stat.publish_status === "Published") {
        processedStats.published += count;
      } else if (stat.is_edited) {
        processedStats.edited += count;
      } else {
        processedStats.draft += count;
      }
    });
    
    res.status(200).json(processedStats);
  } catch (error) {
    console.error("Error fetching template stats:", error);
    res.status(500).json({ message: "Error fetching template stats" });
  }
};