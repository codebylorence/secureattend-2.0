import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const EmployeeSchedule = sequelize.define("EmployeeSchedule", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // UPDATED: Now nullable since we're not using templates
    comment: "DEPRECATED: Reference to ScheduleTemplate (no longer used)"
  },
  shift_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Name of the shift (e.g., 'Morning Shift', 'Night Shift')"
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: "Shift start time (e.g., '08:00:00')"
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: "Shift end time (e.g., '17:00:00')"
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Department for this schedule"
  },
  days: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: "Specific days assigned to this employee: ['Monday', 'Tuesday', ...]"
  },
  schedule_dates: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: "Specific dates for each day: {Monday: ['2025-11-24', '2025-12-01'], Tuesday: ['2025-11-25']}"
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: "Start date for this schedule assignment"
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: "End date for this schedule assignment (null = ongoing)"
  },
  assigned_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Employee ID of who assigned this (team leader or admin)"
  },
  status: {
    type: DataTypes.ENUM("Active", "Inactive"),
    defaultValue: "Active",
  },
}, {
  tableName: "employee_schedules",
  timestamps: true,
});

export default EmployeeSchedule;
