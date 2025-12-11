import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Position = sequelize.define("Position", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  level: {
    type: DataTypes.ENUM("Entry", "Junior", "Senior", "Lead", "Manager", "Director", "Executive"),
    defaultValue: "Entry",
  },
  status: {
    type: DataTypes.ENUM("Active", "Inactive"),
    defaultValue: "Active",
  },
});

export default Position;