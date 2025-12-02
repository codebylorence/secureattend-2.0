import ScheduleTemplate from "../models/scheduleTemplate.js";

export const getAllTemplates = async (includePublishStatus = false) => {
  const where = { status: "Active" };
  
  // For admin (ManageSchedule), show all templates including pending deletion
  // For others (ViewSchedules), show published templates INCLUDING pending deletion
  // Pending deletion templates will stay visible until admin publishes the deletion
  if (includePublishStatus) {
    // ViewSchedules: Only published templates (including those pending deletion)
    where.publish_status = "Published";
    // DON'T filter pending_deletion - let team leaders see them until admin publishes
  }
  // Admin view (ManageSchedule): Show all (no additional filters)
  
  return await ScheduleTemplate.findAll({
    where,
    order: [["department", "ASC"], ["shift_name", "ASC"]],
  });
};

export const getTemplatesByDepartment = async (department, includePublishStatus = true) => {
  const where = { 
    department,
    status: "Active"
  };
  
  // Only show published templates to team leaders (default behavior)
  if (includePublishStatus) {
    where.publish_status = "Published";
    // DON'T filter pending_deletion - let team leaders see them until admin publishes
  }
  
  return await ScheduleTemplate.findAll({
    where,
    order: [["shift_name", "ASC"]],
  });
};

export const getTemplateById = async (id) => {
  return await ScheduleTemplate.findByPk(id);
};

export const createTemplate = async (templateData) => {
  // Check if a template with the same shift name, time, and department already exists
  const existing = await ScheduleTemplate.findOne({
    where: {
      shift_name: templateData.shift_name,
      start_time: templateData.start_time,
      end_time: templateData.end_time,
      department: templateData.department,
      status: "Active"
    }
  });

  if (existing) {
    // Merge days with existing template
    const mergedDays = [...new Set([...existing.days, ...templateData.days])];
    
    // Merge day_limits if present
    let mergedDayLimits = existing.day_limits || {};
    if (templateData.day_limits) {
      mergedDayLimits = {
        ...mergedDayLimits,
        ...templateData.day_limits
      };
    }
    
    console.log(`Merging template: ${existing.shift_name} - adding days from [${existing.days.join(', ')}] to [${mergedDays.join(', ')}]`);
    
    // If we're adding new days to a template marked for deletion, unmark it
    // This means the admin is re-scheduling this zone
    const updateData = {
      days: mergedDays,
      day_limits: Object.keys(mergedDayLimits).length > 0 ? mergedDayLimits : existing.day_limits,
      member_limit: templateData.member_limit || existing.member_limit
    };
    
    // Reset pending_deletion if it was marked for deletion
    if (existing.pending_deletion) {
      console.log(`   Resetting pending_deletion flag (was marked for deletion)`);
      updateData.pending_deletion = false;
      updateData.publish_status = "Draft"; // Ensure it requires publishing
    }
    
    await existing.update(updateData);
    
    return existing;
  }

  // Create new template if no match found
  // Ensure new templates are created as Draft and not pending deletion
  return await ScheduleTemplate.create({
    ...templateData,
    publish_status: "Draft",
    pending_deletion: false
  });
};

export const updateTemplate = async (id, templateData) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return null;
  
  // Preserve publish_status unless explicitly provided
  // This prevents accidental status changes when updating days/limits
  const updateData = { ...templateData };
  if (!updateData.hasOwnProperty('publish_status')) {
    // Don't change publish_status if not provided
    delete updateData.publish_status;
  }
  
  await template.update(updateData);
  return template;
};

export const deleteTemplate = async (id) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return false;
  
  // Mark for deletion instead of actually deleting
  // Keep publish_status as-is so team leaders can still see it until admin publishes
  // The pending_deletion flag will be used to filter it out when needed
  await template.update({
    pending_deletion: true
    // DON'T change publish_status - keep it as "Published" or "Draft"
    // Team leaders will still see published templates until admin clicks "Publish Schedule"
  });
  
  return true;
};

export const permanentlyDeleteTemplate = async (id) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return false;
  
  await template.destroy();
  return true;
};
