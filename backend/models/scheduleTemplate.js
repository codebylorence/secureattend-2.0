import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ScheduleTemplate = sequelize.define("ScheduleTemplate", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
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
    comment: "Array of day names: ['Monday', 'Tuesday', ...]"
  },
  member_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: "Default member limit for all days"
  },
  day_limits: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: "Per-day limits: {Monday: 5, Tuesday: 3, ...}"
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Employee ID of creator (usually admin)"
  },
  status: {
    type: DataTypes.ENUM("Active", "Inactive"),
    defaultValue: "Active",
  },
}, {
  tableName: "schedule_templates",
  timestamps: true,
});

export default ScheduleTemplate;
