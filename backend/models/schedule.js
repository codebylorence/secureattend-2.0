import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Schedule = sequelize.define("Schedule", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shift_name: {
    type: DataTypes.STRING,
    allowNull: true, // Made nullable for multi-shift records
  },
  start_time: {
    type: DataTypes.STRING,
    allowNull: true, // Made nullable for multi-shift records
  },
  end_time: {
    type: DataTypes.STRING,
    allowNull: true, // Made nullable for multi-shift records
  },
  days: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  shifts: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Array of shift objects: [{shift_name, start_time, end_time, days: []}]"
  },
  schedule_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: "Specific date for this schedule instance (e.g., 2025-11-17)"
  },
  member_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  day_limits: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
  is_template: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("Active", "Inactive"),
    defaultValue: "Active",
  },
});

export default Schedule;
