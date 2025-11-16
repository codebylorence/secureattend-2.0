import Schedule from "../models/schedule.js";
import Employee from "../models/employee.js";

export const getAllSchedules = async () => {
  return await Schedule.findAll({
    where: { is_template: false },
    order: [["createdAt", "DESC"]],
  });
};

export const getAllTemplates = async () => {
  return await Schedule.findAll({
    where: { is_template: true },
    order: [["createdAt", "DESC"]],
  });
};

export const getTemplatesByDepartment = async (department) => {
  return await Schedule.findAll({
    where: { 
      is_template: true,
      department: department 
    },
  });
};

export const getSchedulesByEmployeeId = async (employeeId) => {
  return await Schedule.findAll({
    where: { employee_id: employeeId },
  });
};

export const createSchedule = async (scheduleData) => {
  return await Schedule.create(scheduleData);
};

export const updateSchedule = async (id, scheduleData) => {
  const schedule = await Schedule.findByPk(id);
  if (!schedule) return null;
  
  await schedule.update(scheduleData);
  return schedule;
};

export const deleteSchedule = async (id) => {
  const schedule = await Schedule.findByPk(id);
  if (!schedule) return false;
  
  await schedule.destroy();
  return true;
};
