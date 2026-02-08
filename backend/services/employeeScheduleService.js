import EmployeeSchedule from "../models/employeeSchedule.js";
// import ScheduleTemplate from "../models/scheduleTemplate.js"; // DISABLED - table dropped
import Employee from "../models/employee.js";
import { generateScheduleDates } from "../utils/scheduleDateGenerator.js";
// Import associations to ensure they are loaded
import "../models/associations.js";

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

export const getScheduleById = async (id) => {
  const schedule = await EmployeeSchedule.findByPk(id, {
    include: [
      // DISABLED: ScheduleTemplate include - table dropped
      // {
      //   model: ScheduleTemplate,
      //   as: "template",
      // },
      {
        model: Employee,
        as: "employee",
      },
    ],
  });

  if (!schedule) return null;

  return {
    ...schedule.toJSON(),
    // Remove automatic rolling schedule generation
    schedule_dates: schedule.schedule_dates || {}
  };
};

export const getAllEmployeeSchedules = async () => {
  try {
    // Fetch schedules without associations to avoid errors
    const schedules = await EmployeeSchedule.findAll({
      order: [["createdAt", "DESC"]],
    });

    console.log(`📊 Found ${schedules.length} employee schedules`);

    // Group schedules by shift_name + start_date + department to create template-like structure
    const groupedSchedules = {};
    
    schedules.forEach(schedule => {
      const scheduleData = schedule.toJSON();
      
      // Create a unique key for grouping
      const groupKey = `${scheduleData.shift_name || 'Unnamed'}_${scheduleData.start_date || 'no-date'}_${scheduleData.department || 'no-dept'}`;
      
      if (!groupedSchedules[groupKey]) {
        // Create a new template-like entry
        groupedSchedules[groupKey] = {
          id: scheduleData.id, // Use first schedule's ID as template ID
          template_id: scheduleData.id,
          shift_name: scheduleData.shift_name || 'Unnamed Shift',
          start_time: scheduleData.start_time || '00:00',
          end_time: scheduleData.end_time || '00:00',
          department: scheduleData.department || 'Unknown',
          specific_date: scheduleData.start_date, // Map start_date to specific_date
          start_date: scheduleData.start_date,
          end_date: scheduleData.end_date,
          days: scheduleData.days || [],
          schedule_dates: scheduleData.schedule_dates || {},
          member_limit: 999, // No limit for direct scheduling
          assigned_employees: [], // Will be populated below
          createdAt: scheduleData.createdAt,
          updatedAt: scheduleData.updatedAt
        };
      }
      
      // Add this employee to the assigned_employees array
      groupedSchedules[groupKey].assigned_employees.push({
        employee_id: scheduleData.employee_id,
        schedule_id: scheduleData.id,
        assigned_date: scheduleData.createdAt,
        assigned_by: scheduleData.assigned_by || 'admin',
        template_id: groupedSchedules[groupKey].id
      });
    });

    // Convert grouped schedules back to array
    const result = Object.values(groupedSchedules);
    
    console.log(`📊 Grouped ${schedules.length} schedules into ${result.length} template-like entries`);
    
    return result;
  } catch (error) {
    console.error("❌ Error in getAllEmployeeSchedules:", error);
    console.error("Error details:", error.message, error.stack);
    return [];
  }
};

export const getSchedulesByEmployeeId = async (employee_id) => {
  const schedules = await EmployeeSchedule.findAll({
    where: { employee_id }
    // DISABLED: ScheduleTemplate include - table dropped
    // include: [
    //   {
    //     model: ScheduleTemplate,
    //     as: "template",
    //   },
    // ],
  });

  // Remove automatic rolling schedule generation for employee schedules
  return schedules.map(schedule => ({
    ...schedule.toJSON(),
    schedule_dates: schedule.schedule_dates || {}
  }));
};

export const getSchedulesByDepartment = async (department) => {
  const schedules = await EmployeeSchedule.findAll({
    where: { department },
    include: [
      // DISABLED: ScheduleTemplate include - table dropped
      // {
      //   model: ScheduleTemplate,
      //   as: "template",
      //   where: { department },
      // },
      {
        model: Employee,
        as: "employee",
      },
    ],
  });

  // Remove automatic rolling schedule generation for department schedules
  return schedules.map(schedule => ({
    ...schedule.toJSON(),
    schedule_dates: schedule.schedule_dates || {}
  }));
};

export const assignScheduleToEmployee = async (scheduleData) => {
  console.log("🔧 Service: assignScheduleToEmployee called with:", scheduleData);
  
  const { employee_id, template_id, days, start_date, end_date, shift_name, start_time, end_time, department, assigned_by } = scheduleData;

  // Validate required fields
  if (!employee_id) {
    throw new Error("employee_id is required");
  }
  
  // Validate that employee has fingerprint enrolled before scheduling
  console.log("🔍 Checking fingerprint status before scheduling...");
  const hasFingerprint = await checkEmployeeFingerprintStatus(employee_id);
  
  if (!hasFingerprint) {
    console.log(`❌ Cannot schedule employee ${employee_id}: No fingerprint enrolled`);
    throw new Error(`Cannot schedule employee ${employee_id}. Employee must have fingerprint enrolled in the biometric system before being scheduled.`);
  }
  
  console.log(`✅ Employee ${employee_id} has fingerprint enrolled, proceeding with scheduling...`);
  
  // Validate required schedule fields for direct scheduling
  if (!shift_name || !start_time || !end_time) {
    throw new Error("shift_name, start_time, and end_time are required for direct scheduling");
  }
  
  if (!days || !Array.isArray(days) || days.length === 0) {
    throw new Error("days array is required and must not be empty");
  }

  console.log("✅ Validation passed, creating schedule...");

  // Create schedule with direct fields (no template needed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduleToCreate = {
    employee_id,
    template_id: null, // No template needed
    shift_name,
    start_time,
    end_time,
    department: department || null,
    days,
    assigned_by: assigned_by || "admin",
    schedule_dates: {}, // No automatic date generation
    start_date: start_date || today,
    end_date: end_date || null, // null = ongoing
    status: "Active"
  };

  console.log("💾 Creating schedule with data:", scheduleToCreate);

  try {
    const result = await EmployeeSchedule.create(scheduleToCreate);
    console.log("✅ Schedule created successfully:", result.id);
    return result;
  } catch (dbError) {
    console.error("❌ Database error:", dbError);
    throw dbError;
  }
};

export const updateEmployeeSchedule = async (id, updates) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  // Remove automatic rolling schedule regeneration
  // Keep existing schedule_dates as-is, don't auto-generate
  if (updates.days) {
    // Only update if explicitly provided, don't auto-generate
    updates.schedule_dates = updates.schedule_dates || schedule.schedule_dates || {};
  }

  // Remove rolling schedule properties - use explicit dates
  if (updates.start_date) {
    updates.start_date = new Date(updates.start_date);
    updates.start_date.setHours(0, 0, 0, 0);
  }
  // Don't automatically set end_date to null - require explicit end dates

  await schedule.update(updates);
  return schedule;
};

export const deleteEmployeeSchedule = async (id) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  await schedule.destroy();
  return true;
};

export const removeSpecificDays = async (id, daysToRemove) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  // Remove specified days
  const remainingDays = schedule.days.filter((day) => !daysToRemove.includes(day));

  if (remainingDays.length === 0) {
    // No days left, delete the schedule
    await schedule.destroy();
    return null;
  }

  // Update with remaining days without rolling schedule generation
  await schedule.update({
    days: remainingDays,
    schedule_dates: schedule.schedule_dates || {}, // Keep existing dates
    // Don't update start_date or end_date automatically
  });

  return schedule;
};

export const regenerateWeeklySchedules = async () => {
  // Disabled: No longer auto-regenerating rolling schedules
  // Schedules should be created explicitly for specific dates
  console.log("⚠️ regenerateWeeklySchedules is disabled - no automatic rolling schedule generation");
  return 0;
};
