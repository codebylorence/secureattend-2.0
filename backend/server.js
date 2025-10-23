import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { syncDatabase } from "./models/index.js";
import sequelize from "./config/database.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import "./models/employee.js";
import "./models/user.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", userRoutes);

// Database connection
sequelize.sync({ alter: true }) // Use alter:true during dev, remove in prod
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Database connection failed:", err));


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await syncDatabase();
  console.log(`Server running on port ${PORT}`);
});
