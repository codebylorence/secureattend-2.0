import api from "./axiosConfig";

export const getDTR = async ({ employee_id, start_date, end_date }) => {
  const response = await api.get("/dtr", {
    params: { employee_id, start_date, end_date },
  });
  return response.data;
};

export const getAllDTR = async ({ start_date, end_date }) => {
  const response = await api.get("/dtr/all", {
    params: { start_date, end_date },
  });
  return response.data;
};
