import ScheduleTemplate from "../models/scheduleTemplate.js";

export const getAllTemplates = async () => {
  return await ScheduleTemplate.findAll({
    where: { status: "Active" },
    order: [["department", "ASC"], ["shift_name", "ASC"]],
  });
};

export const getTemplatesByDepartment = async (department) => {
  return await ScheduleTemplate.findAll({
    where: { 
      department,
      status: "Active" 
    },
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
    
    await existing.update({
      days: mergedDays,
      day_limits: Object.keys(mergedDayLimits).length > 0 ? mergedDayLimits : existing.day_limits,
      member_limit: templateData.member_limit || existing.member_limit
    });
    
    return existing;
  }

  // Create new template if no match found
  return await ScheduleTemplate.create(templateData);
};

export const updateTemplate = async (id, templateData) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return null;
  
  await template.update(templateData);
  return template;
};

export const deleteTemplate = async (id) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return false;
  
  await template.destroy();
  return true;
};
