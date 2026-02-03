import {
  getAllEmployeeSchedules,
  getSchedulesByEmployeeId,
  getSchedulesByDepartment,
  assignScheduleToEmployee,
  updateEmployeeSchedule,
  deleteEmployeeSchedule,
  removeSpecificDays,
  regenerateWeeklySchedules,
  getScheduleById,
} from "../services/employeeScheduleService.js";
import { 
  getEmployeeSchedulesFromTemplates, 
  getTodaysScheduleFromTemplates,
  assignEmployeesToTemplate 
} from "../services/scheduleTemplateService.js";
import { getTodaysSchedule } from "../utils/scheduleDateGenerator.js";
import { createScheduleNotification } from "./scheduleNotificationController.js";
import User from "../models/user.js";
import Employee from "../models/employee.js";

// Helper function to check if employee has fingerprint enrolled
const checkEmployeeFingerprintStatus = async (employeeId) => {
  try {
    const sqlite3 = await import('sqlite3');
    const { open } = await import('sqlite');
    
    // Path to biometric app's local database
    const dbPath = process.env.BIOMETRIC_DB_PATH || '../BiometricEnrollmentApp/bin/Debug/net9.0-windows/biometric_local.db';
    
    console.log(`🔍 Checking fingerprint status for employee ${employeeId}`);
    
    // Open connection to biometric database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.default.Database
    });
    
    // Query to check if this specific employee has fingerprints enrolled
    const enrollment = await db.get(
      'SELECT employee_id FROM Enrollments WHERE employee_id = ? AND fingerprint_template IS NOT NULL AND fingerprint_template != ""',
      [employeeId]
    );
    
    await db.close();
    
    const hasFingerprint = !!enrollment;
    console.log(`👆 Employee ${employeeId} fingerprint status: ${hasFingerprint ? 'ENROLLED' : 'NOT ENROLLED'}`);
    
    return hasFingerprint;
  } catch (error) {
    console.error(`❌ Error checking fingerprint status for employee ${employeeId}:`, error);
    // If we can't check the database, assume no fingerprint for safety
    return false;
  }
};

// GET /api/employee-schedules
export const getEmployeeSchedules = async (req, res) => {
  try {
    console.log('🌐 API: getEmployeeSchedules called by user:', req.user?.role, req.user?.employeeId);
    
    // Get schedules from both old system and new template system
    const legacySchedules = await getAllEmployeeSchedules();
    const templateSchedules = await getEmployeeSchedulesFromTemplates();
    
    console.log('📊 API: Schedule counts:', {
      legacy: legacySchedules.length,
      template: templateSchedules.length,
      total: legacySchedules.length + templateSchedules.length
    });
    
    // Combine and return both
    const allSchedules = [...legacySchedules, ...templateSchedules];
    res.status(200).json(allSchedules);
  } catch (error) {
    console.error("Error fetching employee schedules:", error);
    res.status(500).json({ message: "Error fetching employee schedules" });
  }
};

// GET /api/employee-schedules/employee/:employee_id
export const getEmployeeSchedule = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    // Get schedules from both old system and new template system
    const legacySchedules = await getSchedulesByEmployeeId(employee_id);
    const templateSchedules = await getEmployeeSchedulesFromTemplates(employee_id);
    
    // Combine and return both
    const allSchedules = [...legacySchedules, ...templateSchedules];
    res.status(200).json(allSchedules);
  } catch (error) {
    console.error("Error fetching employee schedule:", error);
    res.status(500).json({ message: "Error fetching employee schedule" });
  }
};

// GET /api/employee-schedules/department/:department
export const getDepartmentSchedules = async (req, res) => {
  try {
    const { department } = req.params;
    const schedules = await getSchedulesByDepartment(department);
    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching department schedules:", error);
    res.status(500).json({ message: "Error fetching department schedules" });
  }
};

// POST /api/employee-schedules/assign
export const assignSchedule = async (req, res) => {
  try {
    console.log("📥 Assigning schedule with data:", req.body);
    console.log("👤 Request user:", req.user);
    
    const { employee_id, template_id, days, assigned_by, shift_name, start_time, end_time } = req.body;
    
    // Validate that employee has fingerprint enrolled before scheduling
    console.log("🔍 Checking fingerprint status before scheduling...");
    const hasFingerprint = await checkEmployeeFingerprintStatus(employee_id);
    
    if (!hasFingerprint) {
      console.log(`❌ Cannot schedule employee ${employee_id}: No fingerprint enrolled`);
      return res.status(400).json({ 
        message: `Cannot schedule employee ${employee_id}. Employee must have fingerprint enrolled in the biometric system before being scheduled.`,
        error: "FINGERPRINT_REQUIRED",
        employee_id: employee_id
      });
    }
    
    console.log(`✅ Employee ${employee_id} has fingerprint enrolled, proceeding with scheduling...`);
    
    let result;
    
    if (template_id) {
      // Use template-based assignment
      result = await assignEmployeesToTemplate(template_id, [employee_id], assigned_by || req.user?.username || "System");
      console.log("✅ Schedule assigned successfully to template:", template_id);
    } else if (shift_name && start_time && end_time && days) {
      // Use direct assignment for role-based scheduling
      const scheduleData = {
        employee_id,
        shift_name,
        start_time,
        end_time,
        days,
        assigned_by: assigned_by || req.user?.username || "System"
      };
      
      result = await assignScheduleToEmployee(scheduleData);
      console.log("✅ Schedule assigned successfully with direct assignment:", result.id);
    } else {
      throw new Error("Either template_id or (shift_name, start_time, end_time, days) must be provided");
    }
    
    // Create notification for biometric app
    try {
      const assignedByUser = assigned_by || req.user?.username || "System";
      const notificationShiftName = shift_name || "Schedule";
      
      await createScheduleNotification(
        `New schedule assigned to employee ${employee_id}: ${notificationShiftName}`,
        "schedule_update",
        {
          employee_id: employee_id,
          template_id: template_id || null,
          shift_name: notificationShiftName,
          action: "assigned"
        },
        assignedByUser
      );
    } catch (notificationError) {
      console.error("⚠️ Failed to create schedule notification:", notificationError);
      // Don't fail the main operation if notification fails
    }
    
    res.status(201).json({ 
      id: result.id || `schedule-${employee_id}`,
      message: "Schedule assigned successfully",
      template_id: template_id || null,
      employee_id,
      result
    });
  } catch (error) {
    console.error("❌ Error assigning schedule:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Stack trace:", error.stack);
    res.status(500).json({ 
      message: "Error assigning schedule",
      error: error.message 
    });
  }
};

// PUT /api/employee-schedules/:id
export const editEmployeeSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await updateEmployeeSchedule(id, req.body);
    
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    // Create notification for biometric app
    try {
      const updatedBy = req.user?.username || "System";
      const employeeId = schedule.employee_id;
      const shiftName = schedule.template?.shift_name || "Schedule";
      
      await createScheduleNotification(
        `Schedule updated for employee ${employeeId}: ${shiftName}`,
        "schedule_update",
        {
          employee_id: employeeId,
          schedule_id: schedule.id,
          shift_name: shiftName,
          action: "updated"
        },
        updatedBy
      );
    } catch (notificationError) {
      console.error("⚠️ Failed to create schedule notification:", notificationError);
    }
    
    res.status(200).json({ message: "Schedule updated successfully", schedule });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ message: "Error updating schedule" });
  }
};

// DELETE /api/employee-schedules/:id
export const removeEmployeeSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    console.log(`🗑️ DELETE request for schedule ID: ${id} by user:`, currentUser);
    
    // Get the current user's employee information
    const userRecord = await User.findByPk(currentUser.id, {
      include: [{ model: Employee, as: "employee" }]
    });
    
    console.log(`👤 User record found:`, userRecord ? {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      employee: userRecord.employee ? {
        employee_id: userRecord.employee.employee_id,
        fullname: userRecord.employee.fullname
      } : null
    } : 'Not found');
    
    if (!userRecord || !userRecord.employee) {
      console.log(`❌ User employee information not found for user ID: ${currentUser.id}`);
      return res.status(400).json({ message: "User employee information not found" });
    }
    
    // Get the schedule to check ownership
    const schedule = await getScheduleById(id);
    console.log(`📋 Schedule found:`, schedule ? {
      id: schedule.id,
      employee_id: schedule.employee_id,
      shift_name: schedule.template?.shift_name
    } : 'Not found');
    
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    // Prevent team leaders from deleting their own schedules
    if (currentUser.role === "teamleader" && schedule.employee_id === userRecord.employee.employee_id) {
      console.log(`🚫 Team leader ${userRecord.employee.employee_id} attempted to delete their own schedule`);
      return res.status(403).json({ 
        message: "Team leaders cannot delete their own schedules. Please contact an administrator." 
      });
    }
    
    console.log(`✅ Permission check passed. Proceeding with deletion...`);
    const deleted = await deleteEmployeeSchedule(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    // Create notification for biometric app
    try {
      const deletedBy = userRecord.employee.fullname || userRecord.username;
      const employeeId = schedule.employee_id;
      const shiftName = schedule.template?.shift_name || "Schedule";
      
      await createScheduleNotification(
        `Schedule deleted for employee ${employeeId}: ${shiftName}`,
        "schedule_delete",
        {
          employee_id: employeeId,
          schedule_id: id,
          shift_name: shiftName,
          action: "deleted"
        },
        deletedBy
      );
    } catch (notificationError) {
      console.error("⚠️ Failed to create schedule notification:", notificationError);
    }
    
    console.log(`✅ Schedule ${id} deleted successfully by ${currentUser.role} user ${userRecord.employee.employee_id}`);
    res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting schedule:", error);
    res.status(500).json({ message: "Error deleting schedule" });
  }
};

// DELETE /api/employee-schedules/:id/days
export const removeDaysFromSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    const currentUser = req.user;
    
    if (!days || !Array.isArray(days)) {
      return res.status(400).json({ message: "Days array is required" });
    }
    
    // Get the current user's employee information
    const userRecord = await User.findByPk(currentUser.id, {
      include: [{ model: Employee, as: "employee" }]
    });
    
    if (!userRecord || !userRecord.employee) {
      return res.status(400).json({ message: "User employee information not found" });
    }
    
    // Get the schedule to check ownership
    const schedule = await getScheduleById(id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    // Prevent team leaders from deleting their own schedules
    if (currentUser.role === "teamleader" && schedule.employee_id === userRecord.employee.employee_id) {
      return res.status(403).json({ 
        message: "Team leaders cannot modify their own schedules. Please contact an administrator." 
      });
    }
    
    const updatedSchedule = await removeSpecificDays(id, days);
    
    if (updatedSchedule === null) {
      console.log(`✅ All days removed from schedule ${id}, schedule deleted by ${currentUser.role} user ${userRecord.employee.employee_id}`);
      return res.status(200).json({ message: "All days removed, schedule deleted" });
    }
    
    console.log(`✅ Days ${days.join(', ')} removed from schedule ${id} by ${currentUser.role} user ${userRecord.employee.employee_id}`);
    res.status(200).json({ message: "Days removed successfully", schedule: updatedSchedule });
  } catch (error) {
    console.error("Error removing days:", error);
    res.status(500).json({ message: "Error removing days" });
  }
};

// GET /api/employee-schedules/today/:employee_id
export const getTodaysEmployeeSchedule = async (req, res) => {
  try {
    const { employee_id } = req.params;
    
    // First try to get from new template system
    let todaysSchedule = await getTodaysScheduleFromTemplates(employee_id);
    
    // If not found, fall back to legacy system
    if (!todaysSchedule) {
      const schedules = await getSchedulesByEmployeeId(employee_id);
      
      // Find today's schedule from legacy system
      for (const schedule of schedules) {
        const todayInfo = getTodaysSchedule(schedule);
        if (todayInfo) {
          todaysSchedule = {
            ...todayInfo,
            employee_id: schedule.employee_id,
            schedule_id: schedule.id
          };
          break;
        }
      }
    }
    
    if (!todaysSchedule) {
      return res.status(404).json({ message: "No schedule for today" });
    }
    
    res.status(200).json(todaysSchedule);
  } catch (error) {
    console.error("Error fetching today's schedule:", error);
    res.status(500).json({ message: "Error fetching today's schedule" });
  }
};

// GET /api/employee-schedules/published - Get all published schedules for biometric app
export const getPublishedSchedules = async (req, res) => {
  try {
    const schedules = await getAllEmployeeSchedules();
    
    // Transform to format suitable for biometric app
    const publishedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      employee_id: schedule.employee_id,
      template_id: schedule.template_id,
      shift_name: schedule.template.shift_name,
      start_time: schedule.template.start_time,
      end_time: schedule.template.end_time,
      days: schedule.days,
      schedule_dates: schedule.schedule_dates,
      department: schedule.template.department,
      assigned_by: schedule.assigned_by,
      created_at: schedule.createdAt,
      updated_at: schedule.updatedAt
    }));
    
    res.status(200).json(publishedSchedules);
  } catch (error) {
    console.error("Error fetching published schedules:", error);
    res.status(500).json({ message: "Error fetching published schedules" });
  }
};

// POST /api/employee-schedules/regenerate-weekly
export const regenerateWeekly = async (req, res) => {
  try {
    // Disabled: No longer supporting automatic rolling schedule regeneration
    console.log("⚠️ regenerateWeekly endpoint called but is disabled");
    res.status(200).json({ 
      message: "Weekly schedule regeneration is disabled - schedules should be created explicitly",
      regeneratedCount: 0
    });
  } catch (error) {
    console.error("Error in regenerateWeekly:", error);
    res.status(500).json({ message: "Error in regenerateWeekly endpoint" });
  }
};
