import Holiday from "../models/holiday.js";
import { Op } from "sequelize";

/**
 * Returns the holiday record for a given date, or null if not a holiday.
 * @param {string} dateStr - "YYYY-MM-DD"
 */
export const getHolidayForDate = async (dateStr) => {
  return await Holiday.findOne({ where: { date: dateStr } });
};

/**
 * Build a Set of holiday date strings for a date range (for bulk lookups).
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate   - "YYYY-MM-DD"
 * @returns {Map<string, Holiday>} date -> holiday record
 */
export const getHolidayMapForRange = async (startDate, endDate) => {
  const holidays = await Holiday.findAll({
    where: { date: { [Op.between]: [startDate, endDate] } },
  });
  const map = new Map();
  for (const h of holidays) {
    map.set(h.date, h);
  }
  return map;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Determine the day-type status for a given date + employee working days.
 *
 * Priority:
 *   1. Holiday  → { type: "Holiday", holiday }
 *   2. Rest Day → { type: "Rest Day" }
 *   3. Work Day → { type: "Work Day" }
 *
 * @param {string}   dateStr      - "YYYY-MM-DD"
 * @param {string[]} workingDays  - e.g. ["Monday","Tuesday","Wednesday","Thursday","Friday"]
 * @param {Map}      holidayMap   - from getHolidayMapForRange (optional, pass null to skip)
 */
export const getDayType = async (dateStr, workingDays = [], holidayMap = null) => {
  // 1. Check holiday
  const holiday = holidayMap
    ? holidayMap.get(dateStr) || null
    : await getHolidayForDate(dateStr);

  if (holiday) {
    return { type: "Holiday", holiday };
  }

  // 2. Check rest day
  const dayOfWeek = DAY_NAMES[new Date(dateStr + "T00:00:00").getDay()];
  if (workingDays.length > 0 && !workingDays.includes(dayOfWeek)) {
    return { type: "Rest Day", dayOfWeek };
  }

  // 3. Regular work day
  return { type: "Work Day", dayOfWeek };
};

/**
 * Derive attendance status code given day type + clock-in/out data.
 *
 * Returns one of: "H", "HW" (Holiday Worked), "RD", "P", "A", "L", "MCO", "NS"
 */
export const deriveAttendanceStatus = ({
  dayType,       // "Holiday" | "Rest Day" | "Work Day"
  hasClockIn,
  hasClockOut,
  isLate,
  isMissedClockOut,
  hasSchedule,
}) => {
  if (!hasSchedule) return "NS"; // No Schedule

  if (dayType === "Holiday") {
    return hasClockIn ? "HW" : "H"; // Holiday Worked or Holiday
  }

  if (dayType === "Rest Day") {
    return hasClockIn ? "P" : "RD"; // Worked on rest day counts as Present
  }

  // Regular work day
  if (!hasClockIn) return "A";
  if (isMissedClockOut) return "MCO";
  if (isLate) return "L";
  return "P";
};
