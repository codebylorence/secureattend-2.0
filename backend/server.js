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

// --- EXISTING ROUTES ---
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", userRoutes);

// --- NEW BIOMETRIC ROUTE (connects to C# service) ---
app.get("/api/biometric/capture", async (req, res) => {
  try {
    const response = await fetch("http://localhost:5001/api/biometric/capture");
    const data = await response.json();

    // Example: You can optionally save the attendance data to your DB here
    // await Attendance.create({ employeeId, fingerprint: data.fingerprint });

    res.json({
      source: "C# Biometric Service",
      ...data,
    });
  } catch (error) {
    console.error("Error connecting to biometric service:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to connect to biometric device service",
    });
  }
});

// --- DATABASE SYNC ---
sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Database connection failed:", err));

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await syncDatabase();
  console.log(`✅ Node.js Server running on port ${PORT}`);
  console.log(`📡 Connected Biometric Service expected at http://localhost:5001`);
});

