import {
  getAllEmployeeSchedules,
  getSchedulesByEmployeeId,
  getSchedulesByDepartment,
  assignScheduleToEmployee,
  updateEmployeeSchedule,
  deleteEmployeeSchedule,
  removeSpecificDays,
  regenerateWeeklySchedules,
} from "../services/employeeScheduleService.js";
import { getTodaysSchedule } from "../utils/scheduleDateGenerator.js";

// GET /api/employee-schedules
export const getEmployeeSchedules = async (req, res) => {
  try {
    const schedules = await getAllEmployeeSchedules();
    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching employee schedules:", error);
    res.status(500).json({ message: "Error fetching employee schedules" });
  }
};

// GET /api/employee-schedules/employee/:employee_id
export const getEmployeeSchedule = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const schedules = await getSchedulesByEmployeeId(employee_id);
    res.status(200).json(schedules);
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
    console.log("Assigning schedule with data:", req.body);
    const schedule = await assignScheduleToEmployee(req.body);
    console.log("Schedule assigned successfully:", schedule.id);
    res.status(201).json(schedule);
  } catch (error) {
    console.error("Error assigning schedule:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
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
    const deleted = await deleteEmployeeSchedule(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ message: "Error deleting schedule" });
  }
};

// DELETE /api/employee-schedules/:id/days
export const removeDaysFromSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    
    if (!days || !Array.isArray(days)) {
      return res.status(400).json({ message: "Days array is required" });
    }
    
    const schedule = await removeSpecificDays(id, days);
    
    if (schedule === null) {
      return res.status(200).json({ message: "All days removed, schedule deleted" });
    }
    
    res.status(200).json({ message: "Days removed successfully", schedule });
  } catch (error) {
    console.error("Error removing days:", error);
    res.status(500).json({ message: "Error removing days" });
  }
};

// GET /api/employee-schedules/today/:employee_id
export const getTodaysEmployeeSchedule = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const schedules = await getSchedulesByEmployeeId(employee_id);
    
    // Find today's schedule
    let todaysSchedule = null;
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
    const count = await regenerateWeeklySchedules();
    res.status(200).json({ 
      message: "Weekly schedules regenerated successfully",
      regeneratedCount: count
    });
  } catch (error) {
    console.error("Error regenerating weekly schedules:", error);
    res.status(500).json({ message: "Error regenerating weekly schedules" });
  }
};
