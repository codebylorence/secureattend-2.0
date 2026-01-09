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
  publish_status: {
    type: DataTypes.ENUM("Draft", "Published"),
    defaultValue: "Draft", // New schedules are drafts until admin publishes them
    allowNull: true,
    comment: "Draft templates are not visible to team leaders"
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Timestamp when schedule was published"
  },
  published_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Employee ID who published the schedule"
  },
  pending_deletion: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: "True when admin marks for deletion but hasn't published the change yet"
  },
  deleted_days: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: "Days marked for deletion: ['Monday', 'Tuesday', ...]"
  },
  is_edited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: "True when this draft is an edit of an existing published schedule"
  },
  original_template_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "ID of the original published template that this draft is editing",
    references: {
      model: 'schedule_templates',
      key: 'id'
    }
  },
  edited_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Timestamp when the schedule was last edited"
  },
  edited_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Employee ID who last edited the schedule"
  },
}, {
  tableName: "schedule_templates",
  timestamps: true,
});

export default ScheduleTemplate;
