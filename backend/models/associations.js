import Employee from "./employee.js";
import ScheduleTemplate from "./scheduleTemplate.js";
import EmployeeSchedule from "./employeeSchedule.js";
import RegistrationRequest from "./registrationRequest.js";
import User from "./user.js";
import Attendance from "./attendance.js";

// User-Employee associations
User.belongsTo(Employee, { 
  foreignKey: "employeeId", 
  as: "employee" 
});

Employee.hasOne(User, { 
  foreignKey: "employeeId", 
  as: "user" 
});

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

// RegistrationRequest associations
RegistrationRequest.belongsTo(User, {
  foreignKey: "approved_by",
  as: "approver",
});

// Attendance associations
Attendance.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

Employee.hasMany(Attendance, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "attendances",
});

export { Employee, ScheduleTemplate, EmployeeSchedule, RegistrationRequest, Attendance, User };
