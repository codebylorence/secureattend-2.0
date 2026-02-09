import api from "./axiosConfig.js";

const TEMPLATE_API_URL = "/templates";
const EMPLOYEE_SCHEDULE_API_URL = "/employee-schedules";

// ============================================
// Templates API
// ============================================

export const getTemplates = async () => {
  // Add cache-busting parameter to ensure fresh data
  const timestamp = new Date().getTime();
  const response = await api.get(`${TEMPLATE_API_URL}?_t=${timestamp}`);
  console.log(`🌐 API: Fetched ${response.data.length} templates with timestamp ${timestamp}`);
  return response.data;
};

export const getPublishedTemplates = async () => {
  // For backward compatibility, use the same endpoint as getTemplates
  // since there's no more published vs draft distinction
  const timestamp = new Date().getTime();
  const response = await api.get(`${TEMPLATE_API_URL}?_t=${timestamp}`);
  return response.data;
};

export const getTemplatesByDepartment = async (department) => {
  const response = await api.get(`${TEMPLATE_API_URL}/department/${department}`);
  return response.data;
};

export const createTemplate = async (templateData) => {
  const response = await api.post(TEMPLATE_API_URL, templateData);
  return response.data;
};

export const updateTemplate = async (id, templateData) => {
  const response = await api.put(`${TEMPLATE_API_URL}/${id}`, templateData);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await api.delete(`${TEMPLATE_API_URL}/${id}`);
  return response.data;
};

// POST /api/templates/assign-employees - Assign employees to a template
export const assignEmployees = async (assignmentData) => {
  console.log('🌐 API: Assigning employees:', assignmentData);
  const response = await api.post(`${TEMPLATE_API_URL}/assign-employees`, assignmentData);
  console.log('✅ API: Assignment response:', response.data);
  return response.data;
};

// DELETE /api/templates/:id/employees - Remove employees from a template
export const removeEmployeesFromTemplate = async (templateId, employeeIds) => {
  const response = await api.delete(`${TEMPLATE_API_URL}/${templateId}/employees`, {
    data: { employee_ids: employeeIds }
  });
  return response.data;
};

export const publishSchedules = async (publishedBy) => {
  const response = await api.post(`${TEMPLATE_API_URL}/publish`, { published_by: publishedBy });
  return response.data;
};

// ============================================
// Employee Schedules API
// ============================================

export const getEmployeeSchedules = async () => {
  // Add cache-busting parameter to ensure fresh data
  const timestamp = new Date().getTime();
  console.log(`🌐 Frontend API: Calling getEmployeeSchedules with timestamp ${timestamp}`);
  
  try {
    const response = await api.get(`${EMPLOYEE_SCHEDULE_API_URL}?_t=${timestamp}`);
    console.log(`✅ Frontend API: Fetched ${response.data.length} employee schedules`);
    console.log(`📊 Frontend API: Sample schedules:`, response.data.slice(0, 3));
    return response.data;
  } catch (error) {
    console.error(`❌ Frontend API: Error fetching employee schedules:`, error);
    console.error(`❌ Frontend API: Error details:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    
    // Re-throw the error so the calling component can handle it
    throw error;
  }
};

export const getEmployeeScheduleById = async (employeeId) => {
  // Use the template-based schedule endpoint
  const response = await api.get(`${TEMPLATE_API_URL}/employee/${employeeId}`);
  return response.data;
};

export const assignSchedule = async (assignmentData) => {
  const response = await api.post(`${EMPLOYEE_SCHEDULE_API_URL}/assign`, assignmentData);
  return response.data;
};

export const deleteEmployeeSchedule = async (id) => {
  console.log(`🌐 API: Deleting schedule ID: ${id}`);
  
  const response = await api.delete(`${EMPLOYEE_SCHEDULE_API_URL}/${id}`);
  
  console.log(`✅ API: Delete response:`, response.data);
  return response.data;
};

export const removeDaysFromEmployeeSchedule = async (id, days) => {
  console.log(`🌐 API: Removing days from schedule ID: ${id}, days:`, days);
  
  const response = await api.delete(`${EMPLOYEE_SCHEDULE_API_URL}/${id}/days`, {
    data: { days }
  });
  
  console.log(`✅ API: Remove days response:`, response.data);
  return response.data;
};