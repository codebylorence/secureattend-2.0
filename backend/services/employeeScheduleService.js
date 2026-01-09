import EmployeeSchedule from "../models/employeeSchedule.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";
import Employee from "../models/employee.js";
import { generateScheduleDates, generateRollingScheduleDates } from "../utils/scheduleDateGenerator.js";

export const getScheduleById = async (id) => {
  const schedule = await EmployeeSchedule.findByPk(id, {
    include: [
      {
        model: ScheduleTemplate,
        as: "template",
      },
      {
        model: Employee,
        as: "employee",
      },
    ],
  });

  if (!schedule) return null;

  return {
    ...schedule.toJSON(),
    schedule_dates: generateRollingScheduleDates(schedule.days)
  };
};

export const getAllEmployeeSchedules = async () => {
  const schedules = await EmployeeSchedule.findAll({
    include: [
      {
        model: ScheduleTemplate,
        as: "template",
      },
      {
        model: Employee,
        as: "employee",
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Generate rolling schedule dates for each schedule
  return schedules.map(schedule => ({
    ...schedule.toJSON(),
    schedule_dates: generateRollingScheduleDates(schedule.days)
  }));
};

export const getSchedulesByEmployeeId = async (employee_id) => {
  const schedules = await EmployeeSchedule.findAll({
    where: { employee_id },
    include: [
      {
        model: ScheduleTemplate,
        as: "template",
      },
    ],
  });

  // Generate rolling schedule dates for each schedule
  return schedules.map(schedule => ({
    ...schedule.toJSON(),
    schedule_dates: generateRollingScheduleDates(schedule.days)
  }));
};

export const getSchedulesByDepartment = async (department) => {
  const schedules = await EmployeeSchedule.findAll({
    include: [
      {
        model: ScheduleTemplate,
        as: "template",
        where: { department },
      },
      {
        model: Employee,
        as: "employee",
      },
    ],
  });

  // Generate rolling schedule dates for each schedule
  return schedules.map(schedule => ({
    ...schedule.toJSON(),
    schedule_dates: generateRollingScheduleDates(schedule.days)
  }));
};

export const assignScheduleToEmployee = async (scheduleData) => {
  const { employee_id, template_id, days, start_date, end_date } = scheduleData;

  // For new assignments, use rolling schedule dates (current week)
  // This ensures schedules are always current and don't rely on static dates
  const scheduleDates = generateRollingScheduleDates(days);

  // Set start_date to today and end_date to null (ongoing/rolling)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await EmployeeSchedule.create({
    ...scheduleData,
    schedule_dates: scheduleDates,
    start_date: today,
    end_date: null, // Rolling schedules are ongoing
  });
};

export const updateEmployeeSchedule = async (id, updates) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  // For rolling schedules, always regenerate current week dates
  if (updates.days) {
    updates.schedule_dates = generateRollingScheduleDates(updates.days);
  } else {
    // If days didn't change, still regenerate to ensure current dates
    updates.schedule_dates = generateRollingScheduleDates(schedule.days);
  }

  // Keep rolling schedule properties
  updates.start_date = new Date();
  updates.start_date.setHours(0, 0, 0, 0);
  updates.end_date = null; // Rolling schedules are ongoing

  await schedule.update(updates);
  return schedule;
};

export const deleteEmployeeSchedule = async (id) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  await schedule.destroy();
  return true;
};

export const removeSpecificDays = async (id, daysToRemove) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  // Remove specified days
  const remainingDays = schedule.days.filter((day) => !daysToRemove.includes(day));

  if (remainingDays.length === 0) {
    // No days left, delete the schedule
    await schedule.destroy();
    return null;
  }

  // Update with remaining days using rolling schedule dates
  const scheduleDates = generateRollingScheduleDates(remainingDays);

  await schedule.update({
    days: remainingDays,
    schedule_dates: scheduleDates,
    start_date: new Date(),
    end_date: null, // Rolling schedules are ongoing
  });

  return schedule;
};

export const regenerateWeeklySchedules = async () => {
  const schedules = await EmployeeSchedule.findAll();

  let count = 0;
  for (const schedule of schedules) {
    // Regenerate rolling schedule dates for current week
    const scheduleDates = generateRollingScheduleDates(schedule.days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await schedule.update({
      schedule_dates: scheduleDates,
      start_date: today,
      end_date: null, // Rolling schedules are ongoing
    });

    count++;
  }

  return count;
};
