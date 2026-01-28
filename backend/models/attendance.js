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
    allowNull: true, // Allow null for absent records
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
    type: DataTypes.ENUM("IN", "COMPLETED", "Present", "Late", "Absent", "Overtime", "Missed Clock-out"),
    defaultValue: "Present",
    comment: "IN/COMPLETED are legacy values, use Present/Late/Absent/Overtime/Missed Clock-out for new records"
  },
  overtime_hours: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: "Number of overtime hours assigned to this employee for this date"
  },
});

export default Attendance;
