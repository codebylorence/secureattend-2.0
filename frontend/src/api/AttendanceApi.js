import api from "./axiosConfig";

export const getTodayAttendances = async () => {
  const response = await api.get("/attendances/today");
  return response.data;
};

export const getAttendances = async (params = {}) => {
  const response = await api.get("/attendances", { params });
  return response.data;
};

export const recordAttendance = async (data) => {
  const response = await api.post("/attendances", data);
  return response.data;
};

export const deleteAttendance = async (id) => {
  const response = await api.delete(`/attendances/${id}`);
  return response.data;
};

export const getArchivedAttendances = async () => {
  const response = await api.get("/attendances/archived");
  return response.data;
};

export const restoreAttendance = async (id) => {
  const response = await api.put(`/attendances/${id}/restore`);
  return response.data;
};

export const permanentlyDeleteAttendance = async (id) => {
  const response = await api.delete(`/attendances/${id}/permanent`);
  return response.data;
};
