import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  // Update RegistrationRequest table to allow null department
  await queryInterface.changeColumn('RegistrationRequests', 'department', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  // Add role column to RegistrationRequest table
  await queryInterface.addColumn('RegistrationRequests', 'role', {
    type: DataTypes.ENUM("employee", "teamleader", "supervisor", "admin"),
    allowNull: false,
    defaultValue: "employee",
    after: 'position'
  });

  // Update Employee table to allow null department
  await queryInterface.changeColumn('Employees', 'department', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  console.log('✅ Migration completed: Updated department fields to allow null and added role field');
};

export const down = async (queryInterface, Sequelize) => {
  // Revert RegistrationRequest table changes
  await queryInterface.changeColumn('RegistrationRequests', 'department', {
    type: DataTypes.STRING,
    allowNull: false,
  });

  // Remove role column from RegistrationRequest table
  await queryInterface.removeColumn('RegistrationRequests', 'role');

  // Revert Employee table changes
  await queryInterface.changeColumn('Employees', 'department', {
    type: DataTypes.STRING,
    allowNull: false,
  });

  console.log('✅ Migration reverted: Restored department fields to not null and removed role field');
};