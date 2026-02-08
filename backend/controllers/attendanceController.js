import Attendance from "../models/attendance.js";
import Employee from "../models/employee.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
// import ScheduleTemplate from "../models/scheduleTemplate.js"; // DISABLED - table dropped
import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { getCurrentDateInTimezone, getDateInTimezone, getConfiguredTimezone } from "../utils/timezone.js";
import fs from 'fs';
import path from 'path';

export const recordAttendance = async (req, res) => {
  try {
    const { employee_id, clock_in, clock_out, status } = req.body;

    console.log(`📥 Attendance request: employee_id=${employee_id}, clock_in=${clock_in}, clock_out=${clock_out}, status=${status}`);

    // For absent records, clock_in can be null or empty string
    if (!employee_id) {
      console.log("❌ Missing employee_id");
      return res.status(400).json({ error: "employee_id is required" });
    }

    // If status is Absent, clock_in is not required (can be null or empty string)
    if (!clock_in && status !== "Absent") {
      console.log("❌ Missing clock_in for non-absent record");
      return res.status(400).json({ error: "clock_in is required for non-absent records" });
    }
    
    // Normalize empty strings to null for absent records
    const normalizedClockIn = (status === "Absent" && clock_in === '') ? null : clock_in;
    const normalizedClockOut = (clock_out === '') ? null : clock_out;

    // Verify employee exists
    const employee = await Employee.findOne({ where: { employee_id } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get Socket.IO instance
    const io = req.app.get('io');

    // Double-tap prevention: Check for recent attendance activity (within last 10 seconds)
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const recentAttendance = await Attendance.findOne({
      where: {
        employee_id,
        updatedAt: {
          [Op.gte]: tenSecondsAgo
        }
      },
      order: [['updatedAt', 'DESC']]
    });

    if (recentAttendance) {
      const timeDiff = (Date.now() - new Date(recentAttendance.updatedAt).getTime()) / 1000;
      console.log(`⚠️ Double-tap prevention: Recent attendance found for ${employee_id} (${timeDiff.toFixed(1)}s ago)`);
      return res.status(429).json({ 
        error: "Please wait before scanning again", 
        message: `Recent attendance activity detected. Please wait ${Math.ceil(10 - timeDiff)} more seconds.`,
        waitTime: Math.ceil(10 - timeDiff)
      });
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
        if (normalizedClockIn.includes('Z') || normalizedClockIn.includes('+') || normalizedClockIn.includes('-')) {
          // ISO format with timezone - this is already UTC from biometric app
          clockInDate = new Date(normalizedClockIn);
          console.log(`📅 Parsed clock_in as UTC: ${clockInDate.toISOString()}`);
        } else {
          // Assume local time if no timezone specified
          clockInDate = new Date(normalizedClockIn + 'Z'); // Treat as UTC then convert
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
        console.log("❌ Invalid clock_in format:", normalizedClockIn);
        return res.status(400).json({ error: "Invalid clock_in date format" });
      }
    }
    
    // Handle clock_out if provided
    if (normalizedClockOut) {
      try {
        if (normalizedClockOut.includes('Z') || normalizedClockOut.includes('+') || normalizedClockOut.includes('-')) {
          clockOutDate = new Date(normalizedClockOut);
        } else {
          clockOutDate = new Date(normalizedClockOut + 'Z');
        }
        
        if (isNaN(clockOutDate.getTime())) {
          throw new Error("Invalid clock_out date format");
        }
      } catch (error) {
        console.log("❌ Invalid clock_out format:", normalizedClockOut);
        return res.status(400).json({ error: "Invalid clock_out date format" });
      }
    }

    // For clock-out requests, we need to find the open session
    // This could be on today's date OR yesterday's date for overnight shifts
    if (normalizedClockOut) {
      console.log(`🌙 Clock-out request - searching for open session for ${employee_id}`);
      
      // If both clock_in and clock_out are provided, this is a complete session update
      // We should look for the session based on the clock_in time, not current time
      let searchDate;
      if (normalizedClockIn) {
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
      if (!openSession && !normalizedClockIn) {
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
        
        // If this is an overtime session, calculate actual overtime hours worked
        if (openSession.status === "Overtime") {
          console.log(`⏰ Calculating actual overtime hours for ${employee_id}`);
          
          // Get the employee's scheduled shift hours for today
          const scheduleHours = await calculateScheduledHours(employee_id, openSession.date);
          const regularHours = scheduleHours || 8; // Default to 8 hours if no schedule found
          
          // Calculate actual overtime hours worked (hours beyond regular shift)
          const actualOvertimeHours = Math.max(0, totalHours - regularHours);
          
          // Update overtime_hours with actual worked hours (not estimated)
          openSession.overtime_hours = actualOvertimeHours;
          
          console.log(`📊 Overtime calculation for ${employee_id}:`);
          console.log(`  - Total hours worked: ${totalHours.toFixed(2)}`);
          console.log(`  - Regular shift hours: ${regularHours}`);
          console.log(`  - Actual overtime hours: ${actualOvertimeHours.toFixed(2)}`);
        }
        
        await openSession.save();

        console.log(`✅ Clock-out recorded for ${employee_id}, total hours: ${totalHours.toFixed(2)} (session date: ${openSession.date})`);
        
        // Emit WebSocket event for real-time update
        if (io) {
          io.emit('attendance:updated', {
            type: 'clock-out',
            employee_id,
            attendance: openSession
          });
          console.log(`📡 WebSocket event emitted: attendance:updated (clock-out)`);
        }
        
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
    if (!normalizedClockOut) {
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
          
          // Emit WebSocket event for real-time update
          if (io) {
            io.emit('attendance:updated', {
              type: 'absent-to-clockin',
              employee_id,
              attendance: existingRecord
            });
            console.log(`📡 WebSocket event emitted: attendance:updated (absent-to-clockin)`);
          }
          
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
        if (existingRecord.clock_in && existingRecord.clock_out && !normalizedClockOut) {
          console.log(`🔄 Employee ${employee_id} clocking in again after completing previous session`);
          // Create a new attendance record for the new session
          const newAttendance = await Attendance.create({
            employee_id,
            date,
            clock_in: clockInDate,
            status: status || "Present"
          });
          
          console.log(`✅ New clock-in session created for ${employee_id} on ${date}`);
          
          // Emit WebSocket event for real-time update
          if (io) {
            io.emit('attendance:created', {
              type: 'new-session',
              employee_id,
              attendance: newAttendance
            });
            console.log(`📡 WebSocket event emitted: attendance:created (new-session)`);
          }
          
          return res.status(201).json({
            message: "New clock-in session created",
            attendance: newAttendance
          });
        }
        
        // If there's an open session (no clock_out) and trying to clock in again, return error
        if (existingRecord.clock_in && !existingRecord.clock_out && !normalizedClockOut) {
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
      
      // Emit WebSocket event for real-time update
      if (io) {
        io.emit('attendance:created', {
          type: status === "Absent" ? 'absent' : 'clock-in',
          employee_id,
          attendance
        });
        console.log(`📡 WebSocket event emitted: attendance:created (${status === "Absent" ? 'absent' : 'clock-in'})`);
      }
      
      return res.status(201).json({
        message,
        attendance
      });
    } else if (openSession && !normalizedClockOut) {
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
          attributes: ['employee_id', 'firstname', 'lastname', 'email', 'department', 'position'],
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
          attributes: ['employee_id', 'firstname', 'lastname', 'email', 'department', 'position'],
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
// Overtime Management Endpoints

export const assignOvertime = async (req, res) => {
  try {
    const { employee_id, employee_ids, reason, estimated_hours, assigned_date, assigned_by } = req.body;

    console.log(`📥 Overtime assignment request:`, req.body);

    if (!reason || !estimated_hours) {
      return res.status(400).json({ error: "reason and estimated_hours are required" });
    }

    // Handle both single employee and multiple employees
    let employeeIds = [];
    if (employee_ids && Array.isArray(employee_ids)) {
      employeeIds = employee_ids;
    } else if (employee_id) {
      employeeIds = [employee_id];
    } else {
      return res.status(400).json({ error: "employee_id or employee_ids is required" });
    }

    const assignmentDate = assigned_date || getCurrentDateInTimezone();
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const empId of employeeIds) {
      try {
        // Verify employee exists
        const employee = await Employee.findOne({ where: { employee_id: empId } });
        if (!employee) {
          results.push({ employee_id: empId, success: false, error: "Employee not found" });
          errorCount++;
          continue;
        }

        // Check if employee is scheduled for today
        // Get weekday in the configured timezone
        const configPath = path.join(process.cwd(), 'config', 'system-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const timezone = config.timezone || 'UTC';
        
        const now = new Date();
        const today = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'long'
        }).format(now);
        
        // Check if employee has ANY schedule for today (they might have multiple schedules)
        const todaySchedule = await EmployeeSchedule.findOne({
          where: {
            employee_id: empId
          }
          // DISABLED: ScheduleTemplate include - table dropped
          // include: [{
          //   model: ScheduleTemplate,
          //   as: 'template',
          //   required: true,
          //   where: sequelize.literal(`JSON_CONTAINS(template.days, '"${today}"')`)
          // }]
        });

        if (!todaySchedule) {
          results.push({ employee_id: empId, success: false, error: "Employee is not scheduled to work today" });
          errorCount++;
          continue;
        }

        // Check if employee has already clocked in for their regular shift today
        const todayAttendance = await Attendance.findOne({
          where: {
            employee_id: empId,
            date: assignmentDate,
            status: {
              [Op.in]: ["Present", "Late"] // Must have clocked in (not absent)
            },
            clock_in: {
              [Op.not]: null // Must have actually clocked in
            }
          }
        });

        if (!todayAttendance) {
          results.push({ employee_id: empId, success: false, error: "Employee must clock in for regular shift before overtime assignment" });
          errorCount++;
          continue;
        }

        // Check if employee already has overtime assignment for the date
        if (todayAttendance.status === "Overtime") {
          results.push({ employee_id: empId, success: false, error: "Already has overtime assignment for this date" });
          errorCount++;
          continue;
        }

        // Update the existing Present/Late record to Overtime status
        todayAttendance.status = "Overtime";
        todayAttendance.overtime_hours = parseFloat(estimated_hours);
        await todayAttendance.save();
        
        const overtimeRecord = todayAttendance;

        results.push({ 
          employee_id: empId, 
          success: true, 
          employee_name: `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim() || employee.employee_id,
          overtime_id: overtimeRecord.id
        });
        successCount++;

        console.log(`✅ Overtime assigned to ${empId} for ${assignmentDate}`);
      } catch (error) {
        console.error(`❌ Error assigning overtime to ${empId}:`, error);
        results.push({ employee_id: empId, success: false, error: error.message });
        errorCount++;
      }
    }

    console.log(`📊 Overtime assignment complete: ${successCount} success, ${errorCount} errors`);
    
    res.status(200).json({
      message: `Overtime assignment complete: ${successCount} success, ${errorCount} errors`,
      results,
      summary: {
        total: employeeIds.length,
        success: successCount,
        errors: errorCount
      },
      reason,
      estimated_hours
    });
  } catch (error) {
    console.error("❌ Error in bulk overtime assignment:", error);
    res.status(500).json({ error: "Failed to assign overtime" });
  }
};

export const removeOvertime = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const today = getCurrentDateInTimezone();

    console.log(`📥 Overtime removal request for employee: ${employee_id}`);

    // Find overtime record for today
    const overtimeRecord = await Attendance.findOne({
      where: {
        employee_id,
        date: today,
        status: "Overtime"
      }
    });

    if (!overtimeRecord) {
      return res.status(404).json({ error: "No overtime assignment found for this employee" });
    }

    // If employee hasn't clocked out yet, change status back to Present
    // If they have clocked out, we keep the overtime record as is for payroll purposes
    if (!overtimeRecord.clock_out) {
      overtimeRecord.status = "Present";
      overtimeRecord.overtime_hours = null; // Clear overtime hours
      await overtimeRecord.save();
      console.log(`✅ Overtime status changed back to Present for ${employee_id}`);
    } else {
      return res.status(400).json({ error: "Cannot remove overtime - employee has already completed overtime work" });
    }
    
    res.status(200).json({
      message: "Overtime assignment removed successfully"
    });
  } catch (error) {
    console.error("❌ Error removing overtime:", error);
    res.status(500).json({ error: "Failed to remove overtime assignment" });
  }
};

export const getOvertimeEligibleEmployees = async (req, res) => {
  try {
    const today = getCurrentDateInTimezone();
    
    // Get weekday in the configured timezone
    const configPath = path.join(process.cwd(), 'config', 'system-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const timezone = config.timezone || 'UTC';
    
    const now = new Date();
    const todayWeekday = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long'
    }).format(now);
    
    console.log(`📅 Fetching overtime eligible employees for ${today} (${todayWeekday}) in timezone ${timezone}`);
    
    // Step 1: Get all employees who have clocked in today (Present or Late)
    const todayAttendances = await Attendance.findAll({
      where: {
        date: today,
        status: {
          [Op.in]: ["Present", "Late"]
        },
        clock_in: {
          [Op.not]: null
        }
      }
    });

    console.log(`📊 Found ${todayAttendances.length} employees who clocked in today:`, 
      todayAttendances.map(a => `${a.employee_id} (${a.status})`));

    if (todayAttendances.length === 0) {
      console.log(`📊 No employees clocked in today, returning empty list`);
      return res.status(200).json([]);
    }

    // Step 2: Get employee IDs who clocked in
    const clockedInEmployeeIds = todayAttendances.map(att => att.employee_id);
    console.log(`📋 Clocked in employee IDs:`, clockedInEmployeeIds);

    // Step 3: Get all employee schedules for today's weekday
    // Use JSON_CONTAINS for MySQL or JSON array operations for PostgreSQL
    const employeeSchedules = await EmployeeSchedule.findAll({
      where: {
        // Filter by employee schedules that match today
        days: {
          [Op.like]: `%${todayWeekday}%`
        }
      }
      // DISABLED: ScheduleTemplate include - table dropped
      // include: [{
      //   model: ScheduleTemplate,
      //   as: 'template',
      //   required: true,
      //   where: sequelize.literal(`JSON_CONTAINS(template.days, '"${todayWeekday}"')`)
      // }]
    });

    console.log(`📊 Found ${employeeSchedules.length} employee schedules for ${todayWeekday}`);
    console.log(`📋 Schedule details:`, employeeSchedules.map(s => ({
      employee_id: s.employee_id,
      days: s.days,
      shift_name: s.shift_name
    })));
    
    // Step 4: Get employee IDs who are scheduled today
    const scheduledEmployeeIds = employeeSchedules.map(schedule => schedule.employee_id);
    console.log(`📋 Scheduled employee IDs:`, scheduledEmployeeIds);

    // Step 5: Find intersection - employees who are both scheduled AND clocked in
    const eligibleEmployeeIds = clockedInEmployeeIds.filter(empId => 
      scheduledEmployeeIds.includes(empId)
    );
    
    console.log(`📊 Eligible employee IDs (scheduled AND clocked in):`, eligibleEmployeeIds);

    if (eligibleEmployeeIds.length === 0) {
      console.log(`📊 No employees are both scheduled and clocked in today`);
      console.log(`📊 Clocked in but not scheduled:`, clockedInEmployeeIds.filter(id => !scheduledEmployeeIds.includes(id)));
      console.log(`📊 Scheduled but not clocked in:`, scheduledEmployeeIds.filter(id => !clockedInEmployeeIds.includes(id)));
      return res.status(200).json([]);
    }

    // Step 6: Get employee details for eligible employees
    const eligibleEmployees = await Employee.findAll({
      where: {
        employee_id: {
          [Op.in]: eligibleEmployeeIds
        }
      }
    });

    console.log(`📊 Found ${eligibleEmployees.length} eligible employee records`);

    // Step 7: Filter out employees who already have overtime status
    const employeesWithoutOvertime = [];
    for (const employee of eligibleEmployees) {
      const hasOvertime = await Attendance.findOne({
        where: {
          employee_id: employee.employee_id,
          date: today,
          status: "Overtime"
        }
      });

      console.log(`👤 Employee ${employee.employee_id}: hasOvertime=${!!hasOvertime}`);

      if (!hasOvertime) {
        const employeeData = employee.toJSON();
        
        // Return employee data with firstname and lastname
        employeesWithoutOvertime.push({
          ...employeeData,
          firstname: employeeData.firstname || '',
          lastname: employeeData.lastname || ''
        });
      }
    }

    console.log(`📊 Final result: ${employeesWithoutOvertime.length} overtime eligible employees`);
    console.log(`📋 Eligible employees:`, employeesWithoutOvertime.map(e => `${e.employee_id} - ${e.firstname} ${e.lastname}`));
    
    res.status(200).json(employeesWithoutOvertime);
  } catch (error) {
    console.error("❌ Error fetching overtime eligible employees:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch overtime eligible employees" });
  }
};

export const getOvertimeAssignments = async (req, res) => {
  try {
    const today = getCurrentDateInTimezone();
    
    console.log(`📅 Fetching overtime assignments for date: ${today}`);
    
    const overtimeAssignments = await Attendance.findAll({
      where: { 
        date: today,
        status: "Overtime"
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'firstname', 'lastname', 'department', 'position'],
          required: true
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📊 Found ${overtimeAssignments.length} overtime assignments for today`);
    
    // Format the response
    const formattedAssignments = overtimeAssignments.map(assignment => {
      const assignmentData = assignment.toJSON();
      const employee = assignmentData.employee;
      
      let employeeName = 'Unknown Employee';
      if (employee) {
        if (employee.firstname && employee.lastname) {
          employeeName = `${employee.firstname} ${employee.lastname}`;
        }
      }

      return {
        ...assignmentData,
        employee_name: employeeName,
        department: employee?.department || 'N/A',
        position: employee?.position || 'N/A',
        overtime_status: assignmentData.clock_in ? 'In Progress' : 'Assigned'
      };
    });

    res.status(200).json(formattedAssignments);
  } catch (error) {
    console.error("❌ Error fetching overtime assignments:", error);
    res.status(500).json({ error: "Failed to fetch overtime assignments" });
  }
};

// Helper function to calculate scheduled hours for an employee on a specific date
async function calculateScheduledHours(employeeId, date) {
  try {
    // Get the day of the week for the given date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dateObj = new Date(date);
    const dayOfWeek = dayNames[dateObj.getDay()];
    
    console.log(`📅 Calculating scheduled hours for ${employeeId} on ${dayOfWeek} (${date})`);
    
    // Find the employee's schedule for this day
    const schedule = await EmployeeSchedule.findOne({
      where: {
        employee_id: employeeId,
        days: {
          [Op.like]: `%${dayOfWeek}%`
        }
      }
      // DISABLED: ScheduleTemplate include - table dropped
      // include: [{
      //   model: ScheduleTemplate,
      //   as: 'template',
      //   required: true,
      //   where: sequelize.literal(`JSON_CONTAINS(template.days, '"${dayOfWeek}"')`)
      // }]
    });
    
    if (!schedule) {
      console.log(`⚠️ No schedule found for ${employeeId} on ${dayOfWeek}`);
      return 8; // Default to 8 hours
    }
    
    const template = schedule.template;
    
    // Calculate hours from start_time to end_time
    if (template.start_time && template.end_time) {
      const startTime = new Date(`1970-01-01T${template.start_time}`);
      const endTime = new Date(`1970-01-01T${template.end_time}`);
      
      // Handle overnight shifts (end time is next day)
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      const scheduledHours = (endTime - startTime) / (1000 * 60 * 60);
      
      console.log(`📊 Scheduled hours for ${employeeId}: ${scheduledHours} (${template.start_time} - ${template.end_time})`);
      return scheduledHours;
    }
    
    console.log(`⚠️ No start/end time found in schedule template for ${employeeId}`);
    return 8; // Default to 8 hours
    
  } catch (error) {
    console.error(`❌ Error calculating scheduled hours for ${employeeId}:`, error);
    return 8; // Default to 8 hours on error
  }
}

// Endpoint to manually update overtime hours (for admin corrections)
export const updateOvertimeHours = async (req, res) => {
  try {
    const { attendance_id, overtime_hours } = req.body;
    
    console.log(`📥 Manual overtime hours update: attendance_id=${attendance_id}, overtime_hours=${overtime_hours}`);
    
    if (!attendance_id || overtime_hours === undefined) {
      return res.status(400).json({ error: "attendance_id and overtime_hours are required" });
    }
    
    // Find the attendance record
    const attendance = await Attendance.findByPk(attendance_id, {
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'firstname', 'lastname']
      }]
    });
    
    if (!attendance) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    
    // Only allow updating overtime hours for Overtime status records
    if (attendance.status !== "Overtime") {
      return res.status(400).json({ error: "Can only update overtime hours for records with Overtime status" });
    }
    
    const previousHours = attendance.overtime_hours;
    attendance.overtime_hours = parseFloat(overtime_hours);
    await attendance.save();
    
    const employeeName = attendance.employee?.fullname || 
                        `${attendance.employee?.firstname} ${attendance.employee?.lastname}` || 
                        attendance.employee_id;
    
    console.log(`✅ Overtime hours updated for ${employeeName}: ${previousHours} → ${overtime_hours}`);
    
    res.status(200).json({
      message: "Overtime hours updated successfully",
      attendance: {
        id: attendance.id,
        employee_id: attendance.employee_id,
        employee_name: employeeName,
        date: attendance.date,
        previous_overtime_hours: previousHours,
        new_overtime_hours: parseFloat(overtime_hours)
      }
    });
    
  } catch (error) {
    console.error("❌ Error updating overtime hours:", error);
    res.status(500).json({ error: "Failed to update overtime hours" });
  }
};

// Sync attendance records from biometric app to web app
export const syncAttendanceFromBiometric = async (req, res) => {
  try {
    const { records } = req.body;
    
    console.log(`📥 Biometric sync request: ${records?.length || 0} records`);
    
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: "records array is required" });
    }
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    for (const record of records) {
      try {
        const { employee_id, date, clock_in, clock_out, status, total_hours, overtime_hours } = record;
        
        if (!employee_id || !date) {
          results.errors++;
          results.details.push({
            employee_id: employee_id || 'unknown',
            action: 'error',
            message: 'Missing employee_id or date'
          });
          continue;
        }
        
        // Verify employee exists
        const employee = await Employee.findOne({ where: { employee_id } });
        if (!employee) {
          results.errors++;
          results.details.push({
            employee_id,
            action: 'error',
            message: 'Employee not found'
          });
          continue;
        }
        
        // Check if record exists in web app
        const existingRecord = await Attendance.findOne({
          where: {
            employee_id,
            date
          }
        });
        
        if (existingRecord) {
          // Update existing record if biometric app has more recent data
          let updated = false;
          
          // Update clock_in if biometric has it and web app doesn't
          if (clock_in && !existingRecord.clock_in) {
            existingRecord.clock_in = new Date(clock_in);
            updated = true;
          }
          
          // Update clock_out if biometric has it and web app doesn't
          if (clock_out && !existingRecord.clock_out) {
            existingRecord.clock_out = new Date(clock_out);
            updated = true;
          }
          
          // Update total_hours if provided
          if (total_hours !== undefined && total_hours !== null) {
            existingRecord.total_hours = parseFloat(total_hours);
            updated = true;
          }
          
          // Update status with smart logic:
          // 1. Allow upgrading Present/Late to Missed Clock-out (shift ended without clock-out)
          // 2. Allow upgrading to Overtime
          // 3. Don't downgrade from better statuses
          const canUpgradeToMissedClockout = 
            status === 'Missed Clock-out' && 
            (existingRecord.status === 'Present' || existingRecord.status === 'Late' || existingRecord.status === 'IN');
          
          const canUpgradeToOvertime = 
            status === 'Overtime' && 
            existingRecord.status !== 'Overtime';
          
          // Status priority for other cases: Overtime > Missed Clock-out > Late > Present > Absent
          const statusPriority = {
            'Overtime': 5,
            'Missed Clock-out': 4,
            'Late': 3,
            'Present': 2,
            'Absent': 1,
            'IN': 1
          };
          
          const currentPriority = statusPriority[existingRecord.status] || 0;
          const newPriority = statusPriority[status] || 0;
          
          if (canUpgradeToMissedClockout || canUpgradeToOvertime || newPriority > currentPriority) {
            existingRecord.status = status;
            updated = true;
            console.log(`📊 Status updated: ${existingRecord.status} → ${status} for ${employee_id}`);
          }
          
          // Update overtime_hours if provided
          if (overtime_hours !== undefined && overtime_hours !== null) {
            existingRecord.overtime_hours = parseFloat(overtime_hours);
            updated = true;
          }
          
          if (updated) {
            await existingRecord.save();
            results.updated++;
            results.details.push({
              employee_id,
              action: 'updated',
              message: 'Record updated from biometric app'
            });
            console.log(`✅ Updated attendance for ${employee_id} on ${date}`);
          } else {
            results.skipped++;
            results.details.push({
              employee_id,
              action: 'skipped',
              message: 'No updates needed'
            });
          }
        } else {
          // Create new record
          const newRecord = await Attendance.create({
            employee_id,
            date,
            clock_in: clock_in ? new Date(clock_in) : null,
            clock_out: clock_out ? new Date(clock_out) : null,
            status: status || 'Present',
            total_hours: total_hours ? parseFloat(total_hours) : null,
            overtime_hours: overtime_hours ? parseFloat(overtime_hours) : null
          });
          
          results.created++;
          results.details.push({
            employee_id,
            action: 'created',
            message: 'New record created from biometric app'
          });
          console.log(`✅ Created attendance for ${employee_id} on ${date}`);
        }
        
      } catch (error) {
        results.errors++;
        results.details.push({
          employee_id: record.employee_id || 'unknown',
          action: 'error',
          message: error.message
        });
        console.error(`❌ Error syncing record for ${record.employee_id}:`, error);
      }
    }
    
    console.log(`📊 Sync complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`);
    
    res.status(200).json({
      message: 'Sync completed',
      summary: {
        total: records.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors
      },
      details: results.details
    });
    
  } catch (error) {
    console.error("❌ Error syncing attendance from biometric:", error);
    res.status(500).json({ error: "Failed to sync attendance records" });
  }
};