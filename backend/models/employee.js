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
  firstname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Keep fullname for backward compatibility
  fullname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for supervisors/admins
  },
  position: DataTypes.STRING,
  contact_number: DataTypes.STRING,
  email: DataTypes.STRING,
  photo: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  has_fingerprint: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "Indicates if employee has enrolled fingerprint in biometric system"
  },
  status: {
    type: DataTypes.ENUM("Active", "Inactive"),
    defaultValue: "Active",
  },
});

export default Employee;
