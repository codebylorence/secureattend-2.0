import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ShiftTemplate = sequelize.define("ShiftTemplate", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "admin",
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "shift_templates",
  timestamps: true,
});

export default ShiftTemplate;