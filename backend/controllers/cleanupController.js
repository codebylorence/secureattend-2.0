import Attendance from "../models/attendance.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import Employee from "../models/employee.js";
import { Op } from "sequelize";

/**
 * DELETE /api/cleanup/invalid-absences
 * Remove "Absent" records that were created before shift end time
 * This cleans up any premature absent records
 */
export const cleanupInvalidAbsences = async (req, res) => {
  try {
    // Get today's date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    
    // Find all "Absent" records for today
    const absentRecords = await Attendance.findAll({
      where: {
        date: todayDate,
        status: "Absent"
      }
    });
    
    console.log(`🔍 Found ${absentRecords.length} absent records for today`);
    
    // Delete all absent records for today
    // (They will be recreated correctly by the cron job if still valid)
    const deleted = await Attendance.destroy({
      where: {
        date: todayDate,
        status: "Absent"
      }
    });
    
    console.log(`🗑️ Deleted ${deleted} invalid absent records`);
    
    res.status(200).json({
      message: "Invalid absent records cleaned up",
      deleted: deleted
    });
  } catch (error) {
    console.error("Error cleaning up invalid absences:", error);
    res.status(500).json({
      message: "Failed to cleanup invalid absences",
      error: error.message
    });
  }
};

/**
 * DELETE /api/cleanup/all-absences
 * Remove ALL "Absent" records (for testing/reset)
 */
export const cleanupAllAbsences = async (req, res) => {
  try {
    const deleted = await Attendance.destroy({
      where: {
        status: "Absent"
      }
    });
    
    console.log(`🗑️ Deleted ${deleted} absent records`);
    
    res.status(200).json({
      message: "All absent records deleted",
      deleted: deleted
    });
  } catch (error) {
    console.error("Error cleaning up all absences:", error);
    res.status(500).json({
      message: "Failed to cleanup absences",
      error: error.message
    });
  }
};

/**
 * POST /api/cleanup/orphaned-data
 * Remove orphaned attendance records and schedules from deleted employees
 */
export const cleanupOrphanedData = async (req, res) => {
  try {
    // Get all existing employee IDs
    const existingEmployees = await Employee.findAll({
      attributes: ['employee_id']
    });
    const existingEmployeeIds = existingEmployees.map(emp => emp.employee_id);
    
    console.log(`🔍 Found ${existingEmployeeIds.length} existing employees`);
    
    // Find orphaned attendance records
    const orphanedAttendance = await Attendance.findAll({
      where: {
        employee_id: {
          [Op.notIn]: existingEmployeeIds
        }
      }
    });
    
    // Find orphaned schedules
    const orphanedSchedules = await EmployeeSchedule.findAll({
      where: {
        employee_id: {
          [Op.notIn]: existingEmployeeIds
        }
      }
    });
    
    console.log(`🔍 Found ${orphanedAttendance.length} orphaned attendance records`);
    console.log(`🔍 Found ${orphanedSchedules.length} orphaned schedule records`);
    
    // Delete orphaned data
    const deletedAttendance = await Attendance.destroy({
      where: {
        employee_id: {
          [Op.notIn]: existingEmployeeIds
        }
      }
    });
    
    const deletedSchedules = await EmployeeSchedule.destroy({
      where: {
        employee_id: {
          [Op.notIn]: existingEmployeeIds
        }
      }
    });
    
    console.log(`🗑️ Deleted ${deletedAttendance} orphaned attendance records`);
    console.log(`🗑️ Deleted ${deletedSchedules} orphaned schedule records`);
    
    res.status(200).json({
      message: `Cleaned ${deletedAttendance} attendance records and ${deletedSchedules} schedule records`,
      deletedAttendance,
      deletedSchedules
    });
  } catch (error) {
    console.error("Error cleaning up orphaned data:", error);
    res.status(500).json({
      message: "Failed to cleanup orphaned data",
      error: error.message
    });
  }
};
