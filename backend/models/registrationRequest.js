import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const RegistrationRequest = sequelize.define("RegistrationRequest", {
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
    allowNull: false,
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true, // Make department optional
  },
  position: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("employee", "teamleader", "supervisor", "admin"),
    allowNull: false,
    defaultValue: "employee",
  },
  contact_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  photo: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    defaultValue: "pending",
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "users",
      key: "id",
    },
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

export default RegistrationRequest;