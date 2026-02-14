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
    allowNull: false,
    comment: "Reference to ScheduleTemplate"
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
