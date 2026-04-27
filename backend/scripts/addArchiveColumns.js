import sequelize from "../config/database.js";
import { QueryInterface, DataTypes } from "sequelize";

const queryInterface = sequelize.getQueryInterface();

async function addArchiveColumns() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    const tableDesc = await queryInterface.describeTable("Attendances");

    if (!tableDesc.is_archived) {
      await queryInterface.addColumn("Attendances", "is_archived", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
      console.log("✅ Added is_archived column");
    } else {
      console.log("ℹ️  is_archived already exists");
    }

    if (!tableDesc.archived_at) {
      await queryInterface.addColumn("Attendances", "archived_at", {
        type: DataTypes.DATE,
        allowNull: true,
      });
      console.log("✅ Added archived_at column");
    } else {
      console.log("ℹ️  archived_at already exists");
    }

    if (!tableDesc.archived_by) {
      await queryInterface.addColumn("Attendances", "archived_by", {
        type: DataTypes.STRING,
        allowNull: true,
      });
      console.log("✅ Added archived_by column");
    } else {
      console.log("ℹ️  archived_by already exists");
    }

    console.log("🎉 Archive columns ready!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

addArchiveColumns();
