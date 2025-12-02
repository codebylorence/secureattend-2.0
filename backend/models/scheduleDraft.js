import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ScheduleDraft = sequelize.define("ScheduleDraft", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "Employee ID to be assigned"
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Reference to schedule_templates table"
  },
  days: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: "Array of day names: ['Monday', 'Tuesday', ...]"
  },
  assigned_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Employee ID of the person who assigned (usually admin or team leader)"
  },
  action: {
    type: DataTypes.ENUM("create", "update", "delete"),
    allowNull: false,
    defaultValue: "create",
    comment: "Action to perform when published: create new, update existing, or delete"
  },
  employee_schedule_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Reference to existing employee_schedules record (for update/delete actions)"
  },
  status: {
    type: DataTypes.ENUM("pending", "published", "cancelled"),
    defaultValue: "pending",
    allowNull: false,
    comment: "Status of the draft"
  }
}, {
  tableName: "schedule_drafts",
  timestamps: true,
});

export default ScheduleDraft;
