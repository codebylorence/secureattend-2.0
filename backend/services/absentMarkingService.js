import { Op } from "sequelize";
import Employee from "../models/employee.js";
import Attendance from "../models/attendance.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";

/**
 * Mark employees as absent if they haven't clocked in by their shift end time
 */
export const markAbsentEmployees = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayDate = `${year}-${month}-${day}`;
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Get all employee schedules for today
  const schedules = await EmployeeSchedule.findAll({
    where: {
      days: { [Op.contains]: [dayName] },
    },
    include: [
      {
        model: ScheduleTemplate,
        as: "template",
        where: { publish_status: "Published" },
      },
    ],
  });

  let markedAbsent = 0;

  for (const schedule of schedules) {
    const employee_id = schedule.employee_id;
    const shiftEndTime = schedule.template.end_time;

    // Check if shift has ended (current time >= shift end time)
    const hasShiftEnded = currentTime >= shiftEndTime;

    if (!hasShiftEnded) {
      // Skip if shift hasn't ended yet
      continue;
    }

    // Check if employee has already clocked in today OR already marked absent
    const existingAttendance = await Attendance.findOne({
      where: {
        employee_id,
        date: todayDate,
      },
    });

    if (!existingAttendance) {
      // Mark as absent (only if no record exists at all)
      await Attendance.create({
        employee_id,
        date: todayDate,
        time_in: null,
        time_out: null,
        status: "Absent",
      });
      markedAbsent++;
      console.log(`❌ Marked ${employee_id} as absent (shift ended at ${shiftEndTime})`);
    }
  }

  return { markedAbsent, date: todayDate };
};

/**
 * Mark employees as absent for a specific date
 */
export const markAbsentEmployeesForDate = async (dateString) => {
  const targetDate = new Date(dateString);
  const dayName = targetDate.toLocaleDateString("en-US", { weekday: "long" });

  console.log(`🔍 Checking for absent employees on ${dateString} (${dayName})`);

  // Get all employee schedules for that day
  const schedules = await EmployeeSchedule.findAll({
    where: {
      days: { [Op.contains]: [dayName] },
    },
    include: [
      {
        model: ScheduleTemplate,
        as: "template",
        where: { publish_status: "Published" },
      },
    ],
  });

  let markedAbsent = 0;

  for (const schedule of schedules) {
    const employee_id = schedule.employee_id;

    // Check if employee has already clocked in on that date
    const existingAttendance = await Attendance.findOne({
      where: {
        employee_id,
        date: dateString,
      },
    });

    if (!existingAttendance) {
      // Mark as absent
      await Attendance.create({
        employee_id,
        date: dateString,
        time_in: null,
        time_out: null,
        status: "Absent",
      });
      markedAbsent++;
      console.log(`❌ Marked ${employee_id} as absent for ${dateString}`);
    }
  }

  console.log(`✅ Marked ${markedAbsent} employee(s) as absent for ${dateString}`);
  return { markedAbsent, date: dateString };
};
