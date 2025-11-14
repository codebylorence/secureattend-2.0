import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";

export const recordAttendance = async (req, res) => {
  try {
    const { employee_id, clock_in, clock_out, status } = req.body;

    if (!employee_id || !clock_in) {
      return res.status(400).json({ error: "employee_id and clock_in are required" });
    }

    // Verify employee exists
    const employee = await Employee.findOne({ where: { employee_id } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const clockInDate = new Date(clock_in);
    const date = clockInDate.toISOString().split('T')[0];

    // Check if there's an open session for this employee today
    const openSession = await Attendance.findOne({
      where: {
        employee_id,
        date,
        clock_out: null,
        status: "IN"
      }
    });

    if (openSession && clock_out) {
      // Clock out existing session
      const clockOutDate = new Date(clock_out);
      const totalHours = (clockOutDate - new Date(openSession.clock_in)) / (1000 * 60 * 60);
      
      openSession.clock_out = clockOutDate;
      openSession.total_hours = totalHours;
      openSession.status = "COMPLETED";
      await openSession.save();

      return res.status(200).json({
        message: "Clock-out recorded successfully",
        attendance: openSession
      });
    } else if (!openSession && !clock_out) {
      // Create new clock-in session
      const attendance = await Attendance.create({
        employee_id,
        date,
        clock_in: clockInDate,
        status: status || "IN"
      });

      return res.status(201).json({
        message: "Clock-in recorded successfully",
        attendance
      });
    } else if (openSession && !clock_out) {
      return res.status(400).json({ error: "Employee already has an open session today" });
    } else {
      return res.status(400).json({ error: "No open session found for clock-out" });
    }
  } catch (error) {
    console.error("Error recording attendance:", error);
    res.status(500).json({ error: "Failed to record attendance" });
  }
};

export const getAttendances = async (req, res) => {
  try {
    const { date, employee_id } = req.query;
    
    let whereClause = {};
    
    if (date) {
      whereClause.date = date;
    }
    
    if (employee_id) {
      whereClause.employee_id = employee_id;
    }

    const attendances = await Attendance.findAll({
      where: whereClause,
      order: [['clock_in', 'DESC']]
    });

    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching attendances:", error);
    res.status(500).json({ error: "Failed to fetch attendances" });
  }
};

export const getTodayAttendances = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendances = await Attendance.findAll({
      where: { date: today },
      order: [['clock_in', 'DESC']]
    });

    res.status(200).json(attendances);
  } catch (error) {
    console.error("Error fetching today's attendances:", error);
    res.status(500).json({ error: "Failed to fetch today's attendances" });
  }
};
