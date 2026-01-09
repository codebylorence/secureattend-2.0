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
// Helper function to check if a template is an edited version
export const isEditedTemplate = async (templateId) => {
  const template = await ScheduleTemplate.findByPk(templateId);
  return template ? template.is_edited : false;
};

// Helper function to get the original template for an edited template
export const getOriginalTemplate = async (editedTemplateId) => {
  const editedTemplate = await ScheduleTemplate.findByPk(editedTemplateId);
  if (!editedTemplate || !editedTemplate.original_template_id) {
    return null;
  }
  
  return await ScheduleTemplate.findByPk(editedTemplate.original_template_id);
};

// Helper function to find all edited versions of a template
export const getEditedVersions = async (originalTemplateId) => {
  return await ScheduleTemplate.findAll({
    where: {
      original_template_id: originalTemplateId,
      is_edited: true,
      pending_deletion: false
    },
    order: [["edited_at", "DESC"]]
  });
};

// Helper function to create an edited version of a published template
export const createEditedVersion = async (originalTemplateId, editedData, editedBy) => {
  const originalTemplate = await ScheduleTemplate.findByPk(originalTemplateId);
  if (!originalTemplate || originalTemplate.publish_status !== "Published") {
    throw new Error("Original template not found or not published");
  }
  
  // Create edited version with all original data plus edits
  const editedTemplate = await ScheduleTemplate.create({
    ...originalTemplate.dataValues,
    ...editedData,
    id: undefined, // Let database generate new ID
    publish_status: "Draft",
    is_edited: true,
    original_template_id: originalTemplateId,
    edited_at: new Date(),
    edited_by: editedBy,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return editedTemplate;
};