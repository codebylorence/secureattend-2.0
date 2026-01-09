import Employee from "../models/employee.js";
import Attendance from "../models/attendance.js";
import User from "../models/user.js";

/**
 * GET /api/backup/export/employees
 * Export all employee data as JSON
 */
export const exportEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ['username', 'role']
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      totalRecords: employees.length,
      data: employees
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=employees_export_${new Date().toISOString().split('T')[0]}.json`);
    
    res.status(200).json(exportData);
  } catch (error) {
    console.error("Error exporting employees:", error);
    res.status(500).json({
      message: "Failed to export employee data",
      error: error.message
    });
  }
};

/**
 * GET /api/backup/export/attendance
 * Export all attendance data as JSON
 */
export const exportAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findAll({
      order: [["date", "DESC"], ["createdAt", "DESC"]]
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      totalRecords: attendance.length,
      data: attendance
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_export_${new Date().toISOString().split('T')[0]}.json`);
    
    res.status(200).json(exportData);
  } catch (error) {
    console.error("Error exporting attendance:", error);
    res.status(500).json({
      message: "Failed to export attendance data",
      error: error.message
    });
  }
};

/**
 * GET /api/backup/system-stats
 * Get system statistics for admin dashboard
 */
export const getSystemStats = async (req, res) => {
  try {
    const [employeeCount, attendanceCount, userCount] = await Promise.all([
      Employee.count(),
      Attendance.count(),
      User.count()
    ]);

    const stats = {
      totalEmployees: employeeCount,
      totalAttendance: attendanceCount,
      totalUsers: userCount,
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error("Error getting system stats:", error);
    res.status(500).json({
      message: "Failed to get system statistics",
      error: error.message
    });
  }
};