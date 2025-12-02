import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { syncDatabase } from "./models/index.js";
import sequelize from "./config/database.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import scheduleTemplateRoutes from "./routes/scheduleTemplateRoutes.js";
import employeeScheduleRoutes from "./routes/employeeScheduleRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { startScheduleCleanupJob } from "./services/scheduleCleanupService.js";
import "./models/employee.js";
import "./models/user.js";
import "./models/attendance.js";
import "./models/department.js";
import "./models/associations.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- API ROUTES ---
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/templates", scheduleTemplateRoutes);
app.use("/api/employee-schedules", employeeScheduleRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/employees", employeeRoutes);


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
  console.log(`📡 Connected Biometric Service expected at http://localhost:5000`);
  
  // Start the schedule cleanup job
  startScheduleCleanupJob();
});

