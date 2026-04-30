import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Holiday = sequelize.define("Holiday", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("Regular Holiday", "Special Non-Working Day"),
    allowNull: false,
    defaultValue: "Regular Holiday",
  },
});

export default Holiday;
