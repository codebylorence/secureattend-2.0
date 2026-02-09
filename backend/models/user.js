import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

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
  firstname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("admin", "warehouseadmin", "supervisor", "teamleader", "employee"),
    defaultValue: "employee",
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    // Foreign key reference removed - will be added via associations
    // This prevents circular dependency during initial table creation
  },
});

export default User;
