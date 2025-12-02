import axios from "axios";

const API_URL = "http://localhost:5000/api/schedule-drafts";

// Get all pending drafts
export const getPendingDrafts = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Get draft count
export const getDraftCount = async () => {
  const response = await axios.get(`${API_URL}/count`);
  return response.data.count;
};

// Get drafts by employee
export const getEmployeeDrafts = async (employeeId) => {
  const response = await axios.get(`${API_URL}/employee/${employeeId}`);
  return response.data;
};

// Create new draft
export const createDraft = async (draftData) => {
  const response = await axios.post(API_URL, draftData);
  return response.data;
};

// Update draft
export const updateDraft = async (id, draftData) => {
  const response = await axios.put(`${API_URL}/${id}`, draftData);
  return response.data;
};

// Delete draft
export const deleteDraft = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

// Publish all drafts
export const publishDrafts = async (publishedBy) => {
  const response = await axios.post(`${API_URL}/publish`, { published_by: publishedBy });
  return response.data;
};

// Cancel all drafts
export const cancelAllDrafts = async () => {
  const response = await axios.post(`${API_URL}/cancel-all`);
  return response.data;
};
