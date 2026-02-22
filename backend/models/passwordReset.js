import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const PasswordReset = sequelize.define("PasswordReset", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, {
  tableName: 'password_resets',
  timestamps: true,
});

// Define association method
PasswordReset.associate = (models) => {
  PasswordReset.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

export default PasswordReset;
