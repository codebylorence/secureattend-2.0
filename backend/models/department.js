import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Department = sequelize.define("Department", {
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
    type: DataTypes.STRING,
    allowNull: true,
  },
  manager: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

export default Department;
