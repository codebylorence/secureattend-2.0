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
