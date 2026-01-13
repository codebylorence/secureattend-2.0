import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Attendances', 'overtime_hours', {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Number of overtime hours assigned to this employee for this date'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('Attendances', 'overtime_hours');
};