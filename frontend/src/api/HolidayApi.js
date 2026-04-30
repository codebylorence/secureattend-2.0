import api from "./axiosConfig";

export const getHolidays = async (year) => {
  const params = year ? { year } : {};
  const response = await api.get("/holidays", { params });
  return response.data;
};

export const checkHoliday = async (date) => {
  const response = await api.get("/holidays/check", { params: { date } });
  return response.data;
};

export const createHoliday = async (data) => {
  const response = await api.post("/holidays", data);
  return response.data;
};

export const updateHoliday = async (id, data) => {
  const response = await api.put(`/holidays/${id}`, data);
  return response.data;
};

export const deleteHoliday = async (id) => {
  const response = await api.delete(`/holidays/${id}`);
  return response.data;
};
