import ScheduleTemplate from "./scheduleTemplate.js";
import EmployeeSchedule from "./employeeSchedule.js";

// Define associations
EmployeeSchedule.belongsTo(ScheduleTemplate, {
  foreignKey: "template_id",
  as: "template",
});

ScheduleTemplate.hasMany(EmployeeSchedule, {
  foreignKey: "template_id",
  as: "assignments",
});

export { ScheduleTemplate, EmployeeSchedule };
