import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";
import { getCurrentDateInTimezone, getDateInTimezone } from "../utils/timezone.js";

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
    let clockOutDate;
    let date;
    
    if (status === "Absent") {
      // For absent records, use today's date in configured timezone
      date = getCurrentDateInTimezone();
      clockInDate = null; // Don't need clockInDate for absent records
    } else {
      // For normal records, parse the clock_in time
      // Handle both ISO format with timezone and without
      try {
        if (clock_in.includes('Z') || clock_in.includes('+') || clock_in.includes('-')) {
          // ISO format with timezone - this is already UTC from biometric app
          clockInDate = new Date(clock_in);
          console.log(`📅 Parsed clock_in as UTC: ${clockInDate.toISOString()}`);
        } else {
          // Assume local time if no timezone specified
          clockInDate = new Date(clock_in + 'Z'); // Treat as UTC then convert
          console.log(`📅 Parsed clock_in as assumed UTC: ${clockInDate.toISOString()}`);
        }
        
        // Validate the parsed date
        if (isNaN(clockInDate.getTime())) {
          throw new Error("Invalid clock_in date format");
        }
        
        // Use configured timezone date for consistency
        // The clockInDate is in UTC, so we need to convert it to the configured timezone to get the correct date
        date = getDateInTimezone(clockInDate);
        console.log(`📅 Calculated date in configured timezone: ${date}`);
        console.log(`📅 Current timezone date for comparison: ${getCurrentDateInTimezone()}`);
      } catch (error) {
        console.log("❌ Invalid clock_in format:", clock_in);
        return res.status(400).json({ error: "Invalid clock_in date format" });
      }
    }
    
    // Handle clock_out if provided
    if (clock_out) {
      try {
        if (clock_out.includes('Z') || clock_out.includes('+') || clock_out.includes('-')) {
          clockOutDate = new Date(clock_out);
        } else {
          clockOutDate = new Date(clock_out + 'Z');
        }
        
        if (isNaN(clockOutDate.getTime())) {
          throw new Error("Invalid clock_out date format");
        }
      } catch (error) {
        console.log("❌ Invalid clock_out format:", clock_out);
        return res.status(400).json({ error: "Invalid clock_out date format" });
      }
    }

    // For clock-out requests, we need to find the open session
    // This could be on today's date OR yesterday's date for overnight shifts
    if (clock_out) {
      console.log(`🌙 Clock-out request - searching for open session for ${employee_id}`);
      
      // If both clock_in and clock_out are provided, this is a complete session update
      // We should look for the session based on the clock_in time, not current time
      let searchDate;
      if (clock_in) {
        // Use the date from the provided clock_in time
        searchDate = getDateInTimezone(clockInDate);
        console.log(`📅 Using clock_in date for session search: ${searchDate}`);
      } else {
        // Clock-out only request - search current date first, then yesterday
        searchDate = getCurrentDateInTimezone();
        console.log(`📅 Clock-out only - searching current date: ${searchDate}`);
      }
      
      let openSession = await Attendance.findOne({
        where: {
          employee_id,
          date: searchDate,
          clock_out: null,
          status: {
            [Op.in]: ["Present", "Late", "IN"] // Support new and legacy statuses
          }
        }
      });

      // If no session found and this is a clock-out only request, check yesterday for overnight shifts
      if (!openSession && !clock_in) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = getDateInTimezone(yesterday);
        
        console.log(`🌙 No open session found for today (${searchDate}), checking yesterday (${yesterdayDate}) for overnight shifts`);
        
        openSession = await Attendance.findOne({
          where: {
            employee_id,
            date: yesterdayDate,
            clock_out: null,
            status: {
              [Op.in]: ["Present", "Late", "IN"] // Support new and legacy statuses
            }
          }
        });
        
        if (openSession) {
          console.log(`🌙 Found overnight shift session from ${yesterdayDate} for ${employee_id}`);
        }
      }

      if (openSession) {
        // Clock out the found session
        const totalHours = (clockOutDate - new Date(openSession.clock_in)) / (1000 * 60 * 60);
        
        openSession.clock_out = clockOutDate;
        openSession.total_hours = totalHours;
        await openSession.save();

        console.log(`✅ Clock-out recorded for ${employee_id}, total hours: ${totalHours.toFixed(2)} (session date: ${openSession.date})`);
        return res.status(200).json({
          message: "Clock-out recorded successfully",
          attendance: openSession
        });
      } else {
        console.log(`❌ No open session found for ${employee_id} on ${searchDate}${!clock_in ? ` or yesterday` : ''}`);
        return res.status(400).json({ error: "No open session found for clock-out" });
      }
    }

    // Handle clock-in only requests (no clock_out provided)
    if (!clock_out) {
      // Check if ANY attendance record exists for this employee on the calculated date (including Absent)
      console.log(`🔍 Checking for existing attendance record: employee_id=${employee_id}, date=${date}`);
      const existingRecord = await Attendance.findOne({
        where: {
          employee_id,
          date
        }
      });

      console.log(`🔍 Existing record found: ${existingRecord ? 'YES' : 'NO'}`);
      if (existingRecord) {
        console.log(`🔍 Existing record details: id=${existingRecord.id}, status=${existingRecord.status}, date=${existingRecord.date}, clock_in=${existingRecord.clock_in}`);
      }

      if (existingRecord) {
        // If it's an absent record and we're trying to clock in, update it
        if (existingRecord.status === "Absent" && status !== "Absent") {
          existingRecord.clock_in = clockInDate;
          existingRecord.status = status || "Present";
          await existingRecord.save();
          
          console.log(`✅ Absent record updated to clock-in for ${employee_id}`);
          return res.status(200).json({
            message: "Absent record updated to clock-in",
            attendance: existingRecord
          });
        }
        
        // If trying to create another absent record, skip it
        if (existingRecord.status === "Absent" && status === "Absent") {
          console.log(`ℹ️ Absent record already exists for ${employee_id}`);
          return res.status(200).json({
            message: "Absent record already exists",
            attendance: existingRecord
          });
        }
        
        // If there's already a completed record (has both clock_in and clock_out), allow a new clock-in
        if (existingRecord.clock_in && existingRecord.clock_out && !clock_out) {
          console.log(`🔄 Employee ${employee_id} clocking in again after completing previous session`);
          // Create a new attendance record for the new session
          const newAttendance = await Attendance.create({
            employee_id,
            date,
            clock_in: clockInDate,
            status: status || "Present"
          });
          
          console.log(`✅ New clock-in session created for ${employee_id} on ${date}`);
          return res.status(201).json({
            message: "New clock-in session created",
            attendance: newAttendance
          });
        }
        
        // If there's an open session (no clock_out) and trying to clock in again, return error
        if (existingRecord.clock_in && !existingRecord.clock_out && !clock_out) {
          console.log(`⚠️ Employee ${employee_id} already has an open session`);
          return res.status(400).json({ 
            error: "Employee already has an open session today",
            existing_record: {
              id: existingRecord.id,
              clock_in: existingRecord.clock_in,
              status: existingRecord.status
            }
          });
        }
        
        // Otherwise, record already exists and we can't determine what to do
        console.log(`❌ Unclear attendance situation for ${employee_id}: existing record exists but doesn't match expected patterns`);
        return res.status(400).json({ 
          error: "Attendance record already exists for today",
          existing_record: {
            id: existingRecord.id,
            clock_in: existingRecord.clock_in,
            clock_out: existingRecord.clock_out,
            status: existingRecord.status
          }
        });
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
    const { date, employee_id, start_date, end_date } = req.query;
    
    let whereClause = {};
    
    if (date) {
      whereClause.date = date;
    }
    
    if (employee_id) {
      whereClause.employee_id = employee_id;
    }

    // Handle date range filtering for reports
    if (start_date && end_date) {
      whereClause.date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const attendances = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'firstname', 'lastname', 'fullname', 'email', 'department', 'position'],
          required: false // LEFT JOIN to include attendances even if employee is deleted
        }
      ],
      order: [['date', 'DESC'], ['clock_in', 'DESC']]
    });

    // Format the response to include employee information at the top level
    const formattedAttendances = attendances.map(attendance => {
      const attendanceData = attendance.toJSON();
      const employee = attendanceData.employee;
      
      // Get employee name (handle both formats)
      let employeeName = 'Unknown Employee';
      if (employee) {
        if (employee.firstname && employee.lastname) {
          employeeName = `${employee.firstname} ${employee.lastname}`;
        } else if (employee.fullname) {
          employeeName = employee.fullname;
        }
      }

      return {
        ...attendanceData,
        employee_name: employeeName,
        employee_email: employee?.email || `${attendanceData.employee_id}@company.com`,
        department: employee?.department || 'N/A',
        position: employee?.position || 'N/A'
      };
    });

    res.status(200).json(formattedAttendances);
  } catch (error) {
    console.error("❌ Error fetching attendances:", error);
    res.status(500).json({ error: "Failed to fetch attendances" });
  }
};

export const clearTestAttendance = async (req, res) => {
  try {
    const today = getCurrentDateInTimezone();
    
    console.log(`🧹 Clearing test attendance data for ${today}`);
    
    const deleted = await Attendance.destroy({
      where: { date: today }
    });
    
    console.log(`✅ Deleted ${deleted} attendance records for today`);
    
    res.status(200).json({
      message: `Deleted ${deleted} attendance records for today`,
      date: today
    });
  } catch (error) {
    console.error("❌ Error clearing test attendance:", error);
    res.status(500).json({ error: "Failed to clear test attendance" });
  }
};

export const createTestAttendance = async (req, res) => {
  try {
    // Use timezone-aware date
    const today = getCurrentDateInTimezone();
    
    console.log(`🧪 Creating test attendance data for ${today}`);
    
    // First, let's check if we have employees to work with
    const employees = await Employee.findAll({ limit: 3 });
    console.log(`👥 Found ${employees.length} employees in database`);
    
    if (employees.length === 0) {
      return res.status(400).json({ 
        error: "No employees found in database. Please add employees first." 
      });
    }
    
    // Create test attendance records using actual employee IDs
    const testRecords = employees.map((employee, index) => {
      const statuses = ['Present', 'Late', 'Absent'];
      const status = statuses[index % 3];
      
      return {
        employee_id: employee.employee_id,
        date: today,
        clock_in: status === 'Absent' ? null : new Date(now.getTime() - (index + 1) * 60 * 60 * 1000), // Hours ago
        status: status
      };
    });
    
    const createdRecords = [];
    for (const record of testRecords) {
      // Check if record already exists
      const existing = await Attendance.findOne({
        where: {
          employee_id: record.employee_id,
          date: record.date
        }
      });
      
      if (!existing) {
        const created = await Attendance.create(record);
        createdRecords.push(created);
        console.log(`✅ Created test attendance for ${record.employee_id} (${record.status})`);
      } else {
        console.log(`⚠️ Attendance already exists for ${record.employee_id}`);
      }
    }
    
    res.status(200).json({
      message: `Created ${createdRecords.length} test attendance records`,
      records: createdRecords
    });
  } catch (error) {
    console.error("❌ Error creating test attendance:", error);
    res.status(500).json({ error: "Failed to create test attendance" });
  }
};

export const getTodayAttendances = async (req, res) => {
  try {
    // Use timezone-aware date to match user's configured timezone
    const today = getCurrentDateInTimezone();
    
    console.log(`📅 Fetching today's attendances for date: ${today}`);
    
    const attendances = await Attendance.findAll({
      where: { date: today },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'firstname', 'lastname', 'fullname', 'email', 'department', 'position'],
          required: false // LEFT JOIN to include attendances even if employee is deleted
        }
      ],
      order: [['clock_in', 'DESC']]
    });

    console.log(`📊 Found ${attendances.length} attendance records for today (${today})`);
    
    // Log some sample records for debugging
    if (attendances.length > 0) {
      console.log('📋 Sample attendance records:');
      attendances.slice(0, 3).forEach(att => {
        console.log(`  - ${att.employee_id}: ${att.status} at ${att.clock_in || 'N/A'} (date: ${att.date})`);
      });
    }

    // Format the response to include employee information at the top level
    const formattedAttendances = attendances.map(attendance => {
      const attendanceData = attendance.toJSON();
      const employee = attendanceData.employee;
      
      // Get employee name (handle both formats)
      let employeeName = 'Unknown Employee';
      if (employee) {
        if (employee.firstname && employee.lastname) {
          employeeName = `${employee.firstname} ${employee.lastname}`;
        } else if (employee.fullname) {
          employeeName = employee.fullname;
        }
      }

      return {
        ...attendanceData,
        employee_name: employeeName,
        employee_email: employee?.email || `${attendanceData.employee_id}@company.com`,
        department: employee?.department || 'N/A',
        position: employee?.position || 'N/A'
      };
    });

    console.log(`✅ Returning ${formattedAttendances.length} formatted attendance records`);
    res.status(200).json(formattedAttendances);
  } catch (error) {
    console.error("❌ Error fetching today's attendances:", error);
    res.status(500).json({ error: "Failed to fetch today's attendances" });
  }
};
