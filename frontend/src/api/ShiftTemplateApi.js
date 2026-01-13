import api from "./axiosConfig.js";

const SHIFT_TEMPLATE_API_URL = "/shift-templates";

// GET /api/shift-templates
export const getShiftTemplates = async () => {
  const response = await api.get(SHIFT_TEMPLATE_API_URL);
  return response.data;
};

// GET /api/shift-templates/:id
export const getShiftTemplateById = async (id) => {
  const response = await api.get(`${SHIFT_TEMPLATE_API_URL}/${id}`);
  return response.data;
};

// POST /api/shift-templates
export const createShiftTemplate = async (templateData) => {
  const response = await api.post(SHIFT_TEMPLATE_API_URL, templateData);
  return response.data;
};

// PUT /api/shift-templates/:id
export const updateShiftTemplate = async (id, templateData) => {
  const response = await api.put(`${SHIFT_TEMPLATE_API_URL}/${id}`, templateData);
  return response.data;
};

// DELETE /api/shift-templates/:id
export const deleteShiftTemplate = async (id) => {
  const response = await api.delete(`${SHIFT_TEMPLATE_API_URL}/${id}`);
  return response.data;
};