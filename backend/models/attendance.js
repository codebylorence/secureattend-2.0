import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Attendance = sequelize.define("Attendance", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  clock_in: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  clock_out: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  total_hours: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("IN", "COMPLETED", "Present", "Late", "Absent"),
    defaultValue: "Present",
    comment: "IN/COMPLETED are legacy values, use Present/Late/Absent for new records"
  },
});

export default Attendance;
