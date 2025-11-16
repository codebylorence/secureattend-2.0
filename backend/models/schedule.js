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
    allowNull: false,
  },
  start_time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  days: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
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
