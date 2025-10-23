import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Employee from "./employee.js";

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
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
  role: {
    type: DataTypes.ENUM("admin", "teamleader", "employee"),
    defaultValue: "employee",
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "employees",
      key: "id",
    },
    onDelete: "CASCADE",
  },
});

// associations (only here)
User.belongsTo(Employee, { foreignKey: "employeeId", as: "employee" });
Employee.hasOne(User, { foreignKey: "employeeId", as: "user" });

export default User;
