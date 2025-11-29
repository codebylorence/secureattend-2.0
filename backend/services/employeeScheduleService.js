import EmployeeSchedule from "../models/employeeSchedule.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";
import sequelize from "../config/database.js";
import { generateScheduleDates } from "../utils/scheduleDateGenerator.js";

export const getAllEmployeeSchedules = async () => {
  return await EmployeeSchedule.findAll({
    include: [{
      model: ScheduleTemplate,
      as: "template",
    }],
    where: { status: "Active" },
    order: [["employee_id", "ASC"]],
  });
};

export const getSchedulesByEmployeeId = async (employeeId) => {
  return await EmployeeSchedule.findAll({
    where: { 
      employee_id: employeeId,
      status: "Active" 
    },
    include: [{
      model: ScheduleTemplate,
      as: "template",
    }],
  });
};

export const getSchedulesByDepartment = async (department) => {
  return await EmployeeSchedule.findAll({
    include: [{
      model: ScheduleTemplate,
      as: "template",
      where: { department },
    }],
    where: { status: "Active" },
  });
};

export const assignScheduleToEmployee = async (scheduleData) => {
  // scheduleData: { employee_id, template_id, days, assigned_by, start_date, end_date }
  
  // Validate required fields
  if (!scheduleData.employee_id) {
    throw new Error("employee_id is required");
  }
  if (!scheduleData.template_id) {
    throw new Error("template_id is required");
  }
  if (!scheduleData.days || scheduleData.days.length === 0) {
    throw new Error("days array is required and must not be empty");
  }

  // Verify template exists
  const template = await ScheduleTemplate.findByPk(scheduleData.template_id);
  if (!template) {
    throw new Error(`Template with ID ${scheduleData.template_id} not found`);
  }
  
  // Helper function to create date in local timezone
  const createLocalDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) {
      return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
    }
    // If string, parse as local date (YYYY-MM-DD)
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Validate dates - cannot schedule in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today
  
  let startDate = scheduleData.start_date ? createLocalDate(scheduleData.start_date) : new Date(today);
  
  // If start date is in the past, use today instead
  if (startDate < today) {
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    console.log(`⚠️ Start date ${year}-${month}-${day} is in the past, using today instead`);
    startDate = today;
  }
  
  const endDate = scheduleData.end_date ? createLocalDate(scheduleData.end_date) : null;
  
  // Validate end date is after start date
  if (endDate && endDate < startDate) {
    throw new Error("End date cannot be before start date");
  }
  const scheduleDates = generateScheduleDates(scheduleData.days, startDate, endDate);
  
  console.log(`Generating schedule for employee ${scheduleData.employee_id}, template ${scheduleData.template_id}`);
  console.log(`Days: ${scheduleData.days.join(', ')}`);
  console.log(`Generated ${Object.values(scheduleDates).flat().length} total dates`);
  
  // Check if employee already has this template assigned
  const existing = await EmployeeSchedule.findOne({
    where: {
      employee_id: scheduleData.employee_id,
      template_id: scheduleData.template_id,
      status: "Active",
    },
  });

  if (existing) {
    // Merge days (add new days to existing ones)
    const mergedDays = [...new Set([...existing.days, ...scheduleData.days])];
    const mergedScheduleDates = generateScheduleDates(mergedDays, startDate, endDate);
    
    console.log(`Updating existing schedule ${existing.id} - adding days from [${existing.days.join(', ')}] to [${mergedDays.join(', ')}]`);
    
    await existing.update({ 
      days: mergedDays,
      schedule_dates: mergedScheduleDates,
      start_date: startDate,
      end_date: endDate,
      assigned_by: scheduleData.assigned_by
    });
    return existing;
  }

  // Create new assignment with generated dates
  console.log(`Creating new schedule assignment`);
  return await EmployeeSchedule.create({
    ...scheduleData,
    schedule_dates: scheduleDates,
    start_date: startDate,
    end_date: endDate
  });
};

export const updateEmployeeSchedule = async (id, scheduleData) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;
  
  await schedule.update(scheduleData);
  return schedule;
};

export const deleteEmployeeSchedule = async (id) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return false;
  
  await schedule.destroy();
  return true;
};

export const removeSpecificDays = async (id, daysToRemove) => {
  const schedule = await EmployeeSchedule.findByPk(id);
  if (!schedule) return null;

  const remainingDays = schedule.days.filter(day => !daysToRemove.includes(day));
  
  if (remainingDays.length === 0) {
    // No days left, delete the record
    await schedule.destroy();
    return null;
  }

  // Update with remaining days
  await schedule.update({ days: remainingDays });
  return schedule;
};

// Regenerate schedules for the next week when current week ends
export const regenerateWeeklySchedules = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Format today as YYYY-MM-DD
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // Get all active schedules
    const allSchedules = await EmployeeSchedule.findAll({
      where: { status: "Active" },
      include: [{
        model: ScheduleTemplate,
        as: "template",
      }],
    });
    
    let regeneratedCount = 0;
    
    for (const schedule of allSchedules) {
      // Check if all dates in schedule_dates are in the past
      const allDates = Object.values(schedule.schedule_dates || {}).flat();
      const hasFutureDates = allDates.some(date => date >= todayStr);
      
      if (!hasFutureDates && allDates.length > 0) {
        // All dates are in the past, regenerate for next week
        const nextWeekStart = new Date(today);
        const nextWeekEnd = new Date(today);
        nextWeekEnd.setDate(today.getDate() + 6);
        
        const newScheduleDates = generateScheduleDates(
          schedule.days,
          nextWeekStart,
          nextWeekEnd
        );
        
        await schedule.update({
          schedule_dates: newScheduleDates,
          start_date: nextWeekStart,
          end_date: nextWeekEnd
        });
        
        regeneratedCount++;
        console.log(`✅ Regenerated schedule for employee ${schedule.employee_id}`);
      }
    }
    
    console.log(`🔄 Regenerated ${regeneratedCount} schedules for the new week`);
    return regeneratedCount;
  } catch (error) {
    console.error("Error regenerating weekly schedules:", error);
    throw error;
  }
};
