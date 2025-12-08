import Employee from "./employee.js";
import ScheduleTemplate from "./scheduleTemplate.js";
import EmployeeSchedule from "./employeeSchedule.js";

// EmployeeSchedule associations
EmployeeSchedule.belongsTo(ScheduleTemplate, {
  foreignKey: "template_id",
  as: "template",
});

EmployeeSchedule.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

// ScheduleTemplate associations
ScheduleTemplate.hasMany(EmployeeSchedule, {
  foreignKey: "template_id",
  as: "assignments",
});

// Employee associations
Employee.hasMany(EmployeeSchedule, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "schedules",
});

export { Employee, ScheduleTemplate, EmployeeSchedule };
