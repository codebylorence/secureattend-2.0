import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ScheduleNotification = sequelize.define("ScheduleNotification", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("schedule_update", "schedule_publish", "schedule_delete"),
    defaultValue: "schedule_update",
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "JSON string with additional details about the update"
  },
  is_acknowledged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  acknowledged_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

export default ScheduleNotification;