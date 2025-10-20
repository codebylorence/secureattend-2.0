import sequelize from "../config/database.js";

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");
    await sequelize.sync({ alter: true });
    console.log("Tables synchronized successfully");
  } catch (error) {
    console.error("Database connection error:", error);
  }
};

export { sequelize, syncDatabase };

