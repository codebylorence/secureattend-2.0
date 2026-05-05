import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { getHolidayMapForRange } from "../services/holidayService.js";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/**
 * Parse a time string from a datetime and return { h, m, display }
 * Uses local time from the stored UTC datetime.
 */
const parseTime = (dt) => {
  if (!dt) return null;
  const d = new Date(dt);
  const h24 = d.getHours();
  const m = d.getMinutes();
  const h12 = h24 % 12 || 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return {
    h: h24,
    m,
    display: `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`,
  };
};

/**
 * Compute late minutes given clock-in time and shift start time string "HH:MM"
 */
const computeLate = (clockIn, shiftStart) => {
  if (!clockIn || !shiftStart) return 0;
  const [sh, sm] = shiftStart.split(':').map(Number);
  const ci = parseTime(clockIn);
  if (!ci) return 0;
  const lateMin = (ci.h * 60 + ci.m) - (sh * 60 + sm);
  return lateMin > 0 ? lateMin : 0;
};

/**
 * Compute undertime minutes given clock-out time and shift end time string "HH:MM"
 * Handles overnight shifts where end time is past midnight (e.g. 00:00, 01:00)
 */
const computeUndertime = (clockOut, shiftEnd, shiftStart) => {
  if (!clockOut || !shiftEnd) return 0;
  const [eh, em] = shiftEnd.split(':').map(Number);
  const co = parseTime(clockOut);
  if (!co) return 0;

  let endMinutes = eh * 60 + em;
  let coMinutes = co.h * 60 + co.m;

  // Detect overnight shift: end time is earlier in the day than start time
  // e.g. start=16:00, end=00:00 — end is next day
  if (shiftStart) {
    const [sh, sm] = shiftStart.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    if (endMinutes <= startMinutes) {
      // Overnight: add 24 hours to end time
      endMinutes += 24 * 60;
      // If clock-out is in the early morning (before start), it's also next day
      if (coMinutes < startMinutes) {
        coMinutes += 24 * 60;
      }
    }
  }

  const utMin = endMinutes - coMinutes;
  return utMin > 0 ? utMin : 0;
};

const fmtMin = (min) => {
  if (!min || min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

/**
 * Convert "HH:MM" 24-hour string to 12-hour display "HH:MM AM/PM"
 */
const fmtShiftTime = (timeStr) => {
  if (!timeStr) return '';
  const [h24, m] = timeStr.split(':').map(Number);
  const h12 = h24 % 12 || 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
};

/**
 * GET /api/dtr?employee_id=&start_date=&end_date=
 * Returns structured DTR rows for one employee over a date range.
 */
export const getDTR = async (req, res) => {
  try {
    const { employee_id, start_date, end_date } = req.query;

    if (!employee_id || !start_date || !end_date) {
      return res.status(400).json({ error: "employee_id, start_date, end_date are required" });
    }

    // Fetch employee info
    const employee = await Employee.findOne({ where: { employee_id } });
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    // Fetch attendance records for the range
    const records = await Attendance.findAll({
      where: {
        employee_id,
        date: { [Op.between]: [start_date, end_date] },
        is_archived: false,
      },
      order: [["date", "ASC"]],
    });

    // Build attendance map: date -> record
    const attMap = {};
    records.forEach(r => { attMap[r.date] = r.toJSON(); });

    // Fetch shift info for the range via schedule_templates
    const dialect = sequelize.getDialect();
    const isPostgres = dialect === 'postgres';
    const templateTable = isPostgres ? 'schedule_templates' : 'schedule_templates';
    const empMatch = isPostgres
      ? `st.assigned_employees::text LIKE '%' || $1 || '%'`
      : `st.assigned_employees LIKE CONCAT('%', :emp_id, '%')`;

    let shiftByDate = {};
    try {
      const shiftRows = await sequelize.query(
        `SELECT st.specific_date, st.shift_name, st.start_time, st.end_time
         FROM ${templateTable} st
         WHERE st.specific_date BETWEEN :start AND :end
         AND ${isPostgres
           ? `st.assigned_employees::text LIKE '%' || :emp_id || '%'`
           : `st.assigned_employees LIKE CONCAT('%', :emp_id, '%')`}`,
        {
          replacements: { start: start_date, end: end_date, emp_id: employee_id },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      shiftRows.forEach(r => {
        shiftByDate[r.specific_date] = {
          shift_name: r.shift_name,
          start_time: r.start_time,
          end_time: r.end_time,
        };
      });
    } catch (e) {
      console.error("⚠️ DTR shift lookup failed:", e.message);
    }

    // Fetch holidays for the range
    const holidayMap = await getHolidayMapForRange(start_date, end_date);

    // Build DTR rows — one per calendar day in range
    const rows = [];
    const startD = new Date(start_date + 'T00:00:00');
    const endD   = new Date(end_date   + 'T00:00:00');

    let totalLate = 0;
    let totalUndertime = 0;
    let totalHours = 0;

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const dayName = DAY_NAMES[d.getDay()];
      const att = attMap[dateStr] || null;
      const shift = shiftByDate[dateStr] || null;
      const holiday = holidayMap.get(dateStr) || null;

      let timeIn = att?.clock_in ? parseTime(att.clock_in).display : '';
      let timeOut = att?.clock_out ? parseTime(att.clock_out).display : '';
      let lateMin = 0;
      let undertimeMin = 0;
      let hours = att?.total_hours || 0;
      let remarks = '';

      if (holiday) {
        if (!att?.clock_in) {
          remarks = 'H';
        } else if (att.status === 'Late') {
          remarks = 'L';
          lateMin = computeLate(att.clock_in, shift?.start_time);
          undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
        } else {
          remarks = 'HW';
        }
      } else if (dayName === 'Sunday') {
        // Sunday is always Rest Day by default
        remarks = 'RD';
        if (att && att.status !== 'Absent') {
          if (att.status === 'Late') {
            remarks = 'L';
            lateMin = computeLate(att.clock_in, shift?.start_time);
            undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
          } else if (att.status === 'Missed Clock-out' || att.status === 'IN') {
            remarks = 'MCO';
            timeOut = '';
            hours = 0;
          } else if (att.status === 'Overtime') {
            remarks = 'OT';
            lateMin = computeLate(att.clock_in, shift?.start_time);
            undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
          } else {
            remarks = 'P';
          }
        }
      } else if (dayName === 'Saturday') {
        if (att && att.status !== 'Absent') {
          if (att.status === 'Late') {
            remarks = 'L';
            lateMin = computeLate(att.clock_in, shift?.start_time);
            undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
          } else if (att.status === 'Missed Clock-out' || att.status === 'IN') {
            remarks = 'MCO';
            timeOut = '';
            hours = 0;
          } else if (att.status === 'Overtime') {
            remarks = 'OT';
            lateMin = computeLate(att.clock_in, shift?.start_time);
            undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
          } else {
            remarks = 'P';
            undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
          }
        } else if (att?.status === 'Absent') {
          remarks = 'A';
        } else {
          // No attendance — Saturday defaults to NS
          remarks = 'NS';
        }
      } else if (!att) {
        remarks = shift ? 'A' : 'NS';
      } else {
        const status = att.status;
        if (status === 'Absent') {
          remarks = 'A';
        } else if (status === 'Missed Clock-out') {
          remarks = 'MCO';
          timeOut = '';
          hours = 0;
        } else if (status === 'Late') {
          remarks = 'L';
          lateMin = computeLate(att.clock_in, shift?.start_time);
          undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
        } else if (status === 'Overtime') {
          remarks = 'OT';
          lateMin = computeLate(att.clock_in, shift?.start_time);
          undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
        } else {
          remarks = 'P';
          undertimeMin = computeUndertime(att.clock_out, shift?.end_time, shift?.start_time);
        }
      }

      totalLate += lateMin;
      totalUndertime += undertimeMin;
      totalHours += hours;

      rows.push({
        date: dateStr,
        day: d.getDate(),
        dayName,
        shiftStart: shift?.start_time ? fmtShiftTime(shift.start_time) : '',
        shiftEnd: shift?.end_time ? fmtShiftTime(shift.end_time) : '',
        timeIn,
        timeOut,
        late: fmtMin(lateMin),
        undertime: fmtMin(undertimeMin),
        hours: hours > 0 ? parseFloat(hours.toFixed(2)) : '',
        shift: shift?.shift_name || '',
        remarks,
        isHoliday: !!holiday,
        holidayName: holiday?.name || '',
        holidayType: holiday?.type || '',
        isWeekend: dayName === 'Saturday' || dayName === 'Sunday',
      });
    }

    res.status(200).json({
      employee: {
        employee_id: employee.employee_id,
        firstname: employee.firstname,
        lastname: employee.lastname,
        department: employee.department,
        position: employee.position,
      },
      period: { start_date, end_date },
      summary: {
        totalLate: fmtMin(totalLate),
        totalUndertime: fmtMin(totalUndertime),
        totalHours: parseFloat(totalHours.toFixed(2)),
      },
      rows,
    });
  } catch (error) {
    console.error("❌ DTR error:", error);
    res.status(500).json({ error: "Failed to generate DTR" });
  }
};

/**
 * GET /api/dtr/all?start_date=&end_date=
 * Returns DTR for ALL active employees (batch).
 */
export const getAllDTR = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ error: "start_date and end_date are required" });
    }

    const employees = await Employee.findAll({ where: { status: 'Active' } });

    // Reuse getDTR logic by calling it per employee
    const results = [];
    for (const emp of employees) {
      const mockReq = { query: { employee_id: emp.employee_id, start_date, end_date } };
      let dtrData = null;
      const mockRes = {
        status: () => ({ json: (d) => { dtrData = d; } }),
        json: (d) => { dtrData = d; },
      };
      // Call the same logic inline
      await getDTR(mockReq, {
        status: (code) => ({ json: (d) => { if (code === 200) dtrData = d; } }),
        json: (d) => { dtrData = d; },
      });
      if (dtrData) results.push(dtrData);
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("❌ Batch DTR error:", error);
    res.status(500).json({ error: "Failed to generate batch DTR" });
  }
};
