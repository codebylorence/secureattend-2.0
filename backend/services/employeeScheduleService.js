import EmployeeSchedule from "../models/employeeSchedule.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";
import Employee from "../models/employee.js";
import { generateScheduleDates } from "../utils/scheduleDateGenerator.js";

export const getAllEmployeeSchedules = async () => {
  return await EmployeeSchedule.findAll({
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
};

export const getSchedulesByEmployeeId = async (employee_id) => {
  return await EmployeeSchedule.findAll({
    where: { employee_id },
    include: [
      {
        model: ScheduleTemplate,
        as: "template",
      },
    ],
  });
};

export const getSchedulesByDepartment = async (department) => {
  return await EmployeeSchedule.findAll({
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
};

export const assignScheduleToEmployee = async (scheduleData) => {
  const { employee_id, template_id, days, start_date, end_date } = scheduleData;

  // Generate schedule dates
  const scheduleDates = generateScheduleDates(
    days,
    new Date(start_date),
    new Date(end_date)
  );

  return await EmployeeSchedule.create({
    ...scheduleData,
    schedule_dates: scheduleDates,
  });
};

export const updateEmployeeSchedule = async (id, updates) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  // Regenerate schedule dates if days or date range changed
  if (updates.days || updates.start_date || updates.end_date) {
    const days = updates.days || schedule.days;
    const start_date = updates.start_date || schedule.start_date;
    const end_date = updates.end_date || schedule.end_date;

    updates.schedule_dates = generateScheduleDates(
      days,
      new Date(start_date),
      new Date(end_date)
    );
  }

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

  // Update with remaining days
  const scheduleDates = generateScheduleDates(
    remainingDays,
    new Date(schedule.start_date),
    new Date(schedule.end_date)
  );

  await schedule.update({
    days: remainingDays,
    schedule_dates: scheduleDates,
  });

  return schedule;
};

export const regenerateWeeklySchedules = async () => {
  const schedules = await EmployeeSchedule.findAll();

  let count = 0;
  for (const schedule of schedules) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 6);

    const scheduleDates = generateScheduleDates(schedule.days, today, nextWeek);

    await schedule.update({
      schedule_dates: scheduleDates,
      start_date: today,
      end_date: nextWeek,
    });

    count++;
  }

  return count;
};
