import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Notification = sequelize.define("Notification", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "User ID who receives the notification"
  },
  employee_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Employee ID who receives the notification"
  },
  type: {
    type: DataTypes.ENUM("schedule_update", "schedule_published", "general"),
    allowNull: false,
    defaultValue: "general"
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  related_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Related entity ID (e.g., template_id)"
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: "Who created the notification"
  }
}, {
  tableName: "notifications",
  timestamps: true,
});

export default Notification;
