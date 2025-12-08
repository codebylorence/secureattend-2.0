import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { syncDatabase } from "./models/index.js";
import sequelize from "./config/database.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import scheduleTemplateRoutes from "./routes/scheduleTemplateRoutes.js";
import employeeScheduleRoutes from "./routes/employeeScheduleRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import cleanupRoutes from "./routes/cleanupRoutes.js";
import { startScheduleCleanupJob } from "./services/scheduleCleanupService.js";
// Import models first
import "./models/employee.js";
import "./models/user.js";
import "./models/attendance.js";
import "./models/department.js";
import "./models/scheduleTemplate.js";
import "./models/employeeSchedule.js";
import "./models/notification.js";
// Import associations last
import "./models/associations.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make io accessible to routes
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// --- API ROUTES ---
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/templates", scheduleTemplateRoutes);
app.use("/api/employee-schedules", employeeScheduleRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/cleanup", cleanupRoutes);
app.use("/employees", employeeRoutes);


// --- DATABASE SYNC ---
sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Database connection failed:", err));

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  await syncDatabase();
  console.log(`✅ Node.js Server running on port ${PORT}`);
  console.log(`📡 Connected Biometric Service expected at http://localhost:5000`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
  
  // Start the schedule cleanup job
  startScheduleCleanupJob();
  

});

export { io };

