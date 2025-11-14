import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Employee = sequelize.define("Employee", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  fullname: DataTypes.STRING,
  department: DataTypes.STRING,
  position: DataTypes.STRING,
  contact_number: DataTypes.STRING,
  email: DataTypes.STRING,
  photo: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("Active", "Inactive"),
    defaultValue: "Active",
  },
});

export default Employee;
