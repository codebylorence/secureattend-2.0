import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  // Add Overtime to the status enum
  await queryInterface.changeColumn('Attendances', 'status', {
    type: DataTypes.ENUM("IN", "COMPLETED", "Present", "Late", "Absent", "Overtime"),
    defaultValue: "Present",
    comment: "IN/COMPLETED are legacy values, use Present/Late/Absent/Overtime for new records"
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove Overtime from the status enum
  await queryInterface.changeColumn('Attendances', 'status', {
    type: DataTypes.ENUM("IN", "COMPLETED", "Present", "Late", "Absent"),
    defaultValue: "Present",
    comment: "IN/COMPLETED are legacy values, use Present/Late/Absent for new records"
  });
};