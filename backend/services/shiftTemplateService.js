import ShiftTemplate from "../models/shiftTemplate.js";

export const getAllShiftTemplates = async () => {
  return await ShiftTemplate.findAll({
    where: { is_active: true },
    order: [["name", "ASC"]],
  });
};

export const getShiftTemplateById = async (id) => {
  return await ShiftTemplate.findByPk(id);
};

export const createShiftTemplate = async (templateData) => {
  return await ShiftTemplate.create(templateData);
};

export const updateShiftTemplate = async (id, updates) => {
  const template = await ShiftTemplate.findByPk(id);
  if (!template) return null;

  await template.update(updates);
  return template;
};

export const deleteShiftTemplate = async (id) => {
  const template = await ShiftTemplate.findByPk(id);
  if (!template) return null;

  // Soft delete by setting is_active to false
  await template.update({ is_active: false });
  return true;
};

export const permanentlyDeleteShiftTemplate = async (id) => {
  const template = await ShiftTemplate.findByPk(id);
  if (!template) return null;

  await template.destroy();
  return true;
};