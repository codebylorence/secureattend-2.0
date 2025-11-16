import {
  getAllSchedules,
  getAllTemplates,
  getTemplatesByDepartment,
  getSchedulesByEmployeeId,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../services/scheduleService.js";

// GET /api/schedules
export const getSchedules = async (req, res) => {
  try {
    const schedules = await getAllSchedules();
    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ message: "Error fetching schedules" });
  }
};

// GET /api/schedules/templates
export const getTemplates = async (req, res) => {
  try {
    const templates = await getAllTemplates();
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ message: "Error fetching templates", error: error.message });
  }
};

// GET /api/schedules/templates/department/:department
export const getDepartmentTemplates = async (req, res) => {
  try {
    const { department } = req.params;
    const templates = await getTemplatesByDepartment(department);
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching department templates:", error);
    res.status(500).json({ message: "Error fetching department templates" });
  }
};

// GET /api/schedules/employee/:employee_id
export const getEmployeeSchedules = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const schedules = await getSchedulesByEmployeeId(employee_id);
    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching employee schedules:", error);
    res.status(500).json({ message: "Error fetching employee schedules" });
  }
};

// POST /api/schedules
export const addSchedule = async (req, res) => {
  try {
    console.log("Creating schedule with data:", req.body);
    
    // If assigning to an employee (not a template), check member limit
    if (!req.body.is_template && req.body.employee_id) {
      // Get the template for this department and shift
      const templates = await getTemplatesByDepartment(req.body.department);
      const template = templates.find(t => 
        t.shift_name === req.body.shift_name &&
        t.days.some(day => req.body.days.includes(day))
      );
      
      if (template) {
        // Check each day for member limit (use day_limits if available, otherwise member_limit)
        for (const day of req.body.days) {
          const existingAssignments = await getAllSchedules();
          const assignmentsForDay = existingAssignments.filter(s => 
            s.department === req.body.department &&
            s.shift_name === req.body.shift_name &&
            s.days.includes(day) &&
            s.employee_id !== null
          );
          
          // Get the limit for this specific day
          let dayLimit = null;
          if (template.day_limits && template.day_limits[day]) {
            dayLimit = template.day_limits[day];
          } else if (template.member_limit) {
            dayLimit = template.member_limit;
          }
          
          if (dayLimit && assignmentsForDay.length >= dayLimit) {
            return res.status(400).json({ 
              message: `Member limit reached for ${req.body.shift_name} on ${day}. Maximum ${dayLimit} members allowed.` 
            });
          }
        }
      }
    }
    
    const schedule = await createSchedule(req.body);
    console.log("Schedule created successfully:", schedule);
    
    // If creating a template, automatically assign it to the team leader of that department
    if (req.body.is_template && req.body.department) {
      try {
        // Import User and Employee models
        const { default: User } = await import("../models/user.js");
        const { default: Employee } = await import("../models/employee.js");
        
        // Find team leader for this department
        // Need to find User with role='teamleader' whose Employee has matching department
        const teamLeaderUser = await User.findOne({
          where: {
            role: "teamleader"
          },
          include: [{
            model: Employee,
            as: "employee",
            where: {
              department: req.body.department
            }
          }]
        });
        
        if (teamLeaderUser && teamLeaderUser.employee) {
          // Create a schedule assignment for the team leader
          await createSchedule({
            employee_id: teamLeaderUser.employee.employee_id,
            shift_name: req.body.shift_name,
            start_time: req.body.start_time,
            end_time: req.body.end_time,
            days: req.body.days,
            department: req.body.department,
            is_template: false,
            created_by: req.body.created_by
          });
          console.log(`✅ Automatically assigned schedule to team leader: ${teamLeaderUser.employee.employee_id} (${teamLeaderUser.employee.fullname})`);
        } else {
          console.log(`⚠️ No team leader found for department: ${req.body.department}`);
        }
      } catch (autoAssignError) {
        console.error("Error auto-assigning to team leader:", autoAssignError);
        // Don't fail the template creation if auto-assign fails
      }
    }
    
    res.status(201).json(schedule);
  } catch (error) {
    console.error("Error creating schedule:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ message: "Error creating schedule", error: error.message });
  }
};

// PUT /api/schedules/:id
export const editSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await updateSchedule(id, req.body);
    
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    res.status(200).json({ message: "Schedule updated successfully", schedule });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ message: "Error updating schedule" });
  }
};

// DELETE /api/schedules/:id
export const removeSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteSchedule(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    
    res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ message: "Error deleting schedule" });
  }
};
