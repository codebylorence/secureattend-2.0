import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { syncDatabase } from "./models/index.js";
import sequelize from "./config/database.js";
import employeeRoutes from "./routes/employeeRoutes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

//Routes
app.use("/api/employees", employeeRoutes);

// Database connection
sequelize
  .sync()
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Database connection failed:", err));


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await syncDatabase();
  console.log(`Server running on port ${PORT}`);
});
