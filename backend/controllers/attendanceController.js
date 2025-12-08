import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";

export const recordAttendance = async (req, res) => {
  try {
    const { employee_id, clock_in, clock_out, status } = req.body;

    console.log(`📥 Attendance request: employee_id=${employee_id}, clock_in=${clock_in}, clock_out=${clock_out}, status=${status}`);

    // For absent records, clock_in can be null
    if (!employee_id) {
      console.log("❌ Missing employee_id");
      return res.status(400).json({ error: "employee_id is required" });
    }

    // If status is Absent, clock_in is not required
    if (!clock_in && status !== "Absent") {
      console.log("❌ Missing clock_in for non-absent record");
      return res.status(400).json({ error: "clock_in is required for non-absent records" });
    }

    // Verify employee exists
    const employee = await Employee.findOne({ where: { employee_id } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // For absent records, use today's date; for others, parse clock_in
    let clockInDate;
    let date;
    
    if (status === "Absent") {
      // For absent records, use today's date
      const today = new Date();
      date = today.toISOString().split('T')[0];
      clockInDate = null; // Don't need clockInDate for absent records
    } else {
      // For normal records, parse the clock_in time
      clockInDate = new Date(clock_in);
      date = clockInDate.toISOString().split('T')[0];
    }

    // Check if there's an open session for this employee today
    // Look for sessions with Present, Late, or legacy IN status that don't have clock_out
    const openSession = await Attendance.findOne({
      where: {
        employee_id,
        date,
        clock_out: null,
        status: {
          [Op.in]: ["Present", "Late", "IN"] // Support new and legacy statuses
        }
      }
    });

    if (openSession && clock_out) {
      // Clock out existing session
      const clockOutDate = new Date(clock_out);
      const totalHours = (clockOutDate - new Date(openSession.clock_in)) / (1000 * 60 * 60);
      
      openSession.clock_out = clockOutDate;
      openSession.total_hours = totalHours;
      // Keep the original status (Present or Late) - don't change to COMPLETED
      // The status field now represents punctuality, not completion state
      await openSession.save();

      return res.status(200).json({
        message: "Clock-out recorded successfully",
        attendance: openSession
      });
    } else if (!openSession && !clock_out) {
      // Check if ANY attendance record exists for this employee today (including Absent)
      const existingRecord = await Attendance.findOne({
        where: {
          employee_id,
          date
        }
      });

      if (existingRecord) {
        // If it's an absent record and we're trying to clock in, update it
        if (existingRecord.status === "Absent" && status !== "Absent") {
          existingRecord.clock_in = clockInDate;
          existingRecord.status = status || "Present";
          await existingRecord.save();
          
          return res.status(200).json({
            message: "Absent record updated to clock-in",
            attendance: existingRecord
          });
        }
        
        // If trying to create another absent record, skip it
        if (existingRecord.status === "Absent" && status === "Absent") {
          return res.status(200).json({
            message: "Absent record already exists",
            attendance: existingRecord
          });
        }
        
        // Otherwise, record already exists
        return res.status(400).json({ error: "Attendance record already exists for today" });
      }

      // Create new attendance record
      const attendance = await Attendance.create({
        employee_id,
        date,
        clock_in: status === "Absent" ? null : clockInDate, // Null for absent records
        status: status || "Present" // Default to Present instead of IN
      });

      const message = status === "Absent" ? "Absent record created successfully" : "Clock-in recorded successfully";
      console.log(`✅ ${message} for ${employee_id} on ${date}`);
      
      return res.status(201).json({
        message,
        attendance
      });
    } else if (openSession && !clock_out) {
      return res.status(400).json({ error: "Employee already has an open session today" });
    } else {
      return res.status(400).json({ error: "No open session found for clock-out" });
    }
  } catch (error) {
    console.error("❌ Error recording attendance:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      error: "Failed to record attendance",
      details: error.message 
    });
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
