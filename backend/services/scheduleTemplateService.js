import ScheduleTemplate from "../models/scheduleTemplate.js";

export const getAllTemplates = async (publishedOnly = false) => {
  const where = publishedOnly ? { publish_status: "Published", pending_deletion: false } : {};
  return await ScheduleTemplate.findAll({
    where,
    order: [["createdAt", "DESC"]],
  });
};

export const getTemplatesByDepartment = async (department) => {
  return await ScheduleTemplate.findAll({
    where: { department },
    order: [["createdAt", "DESC"]],
  });
};

export const getTemplateById = async (id) => {
  return await ScheduleTemplate.findByPk(id);
};

export const createTemplate = async (templateData) => {
  return await ScheduleTemplate.create(templateData);
};

export const updateTemplate = async (id, updates) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return null;

  await template.update(updates);
  return template;
};

export const deleteTemplate = async (id) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return null;

  // Mark for deletion instead of deleting immediately
  await template.update({ pending_deletion: true });
  return true;
};

export const permanentlyDeleteTemplate = async (id) => {
  const template = await ScheduleTemplate.findByPk(id);
  if (!template) return null;

  await template.destroy();
  return true;
};
