import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TemplateDraft = sequelize.define("TemplateDraft", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Reference to existing schedule_templates (null for new templates)"
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
  },
  action: {
    type: DataTypes.ENUM("create", "update", "delete"),
    allowNull: false,
    defaultValue: "create",
    comment: "Action to perform when published"
  },
  status: {
    type: DataTypes.ENUM("pending", "published", "cancelled"),
    defaultValue: "pending",
    allowNull: false,
  }
}, {
  tableName: "template_drafts",
  timestamps: true,
});

export default TemplateDraft;
