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
// Trigger restart
import departmentRoutes from "./routes/departmentRoutes.js";
import scheduleTemplateRoutes from "./routes/scheduleTemplateRoutes.js";
import employeeScheduleRoutes from "./routes/employeeScheduleRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import cleanupRoutes from "./routes/cleanupRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import positionRoutes from "./routes/positionRoutes.js";
import backupRoutes from "./routes/backupRoutes.js";
import systemConfigRoutes from "./routes/systemConfigRoutes.js";
import scheduleNotificationRoutes from "./routes/scheduleNotificationRoutes.js";
import shiftTemplateRoutes from "./routes/shiftTemplateRoutes.js";
import { startScheduleCleanupJob } from "./services/scheduleCleanupService.js";
// Import models first
import "./models/employee.js";
import "./models/user.js";
import "./models/attendance.js";
import "./models/department.js";
import "./models/scheduleTemplate.js";
import "./models/employeeSchedule.js";
import "./models/notification.js";
import "./models/registrationRequest.js";
import "./models/position.js";
import "./models/scheduleNotification.js";
import "./models/shiftTemplate.js";
// Import associations last
import "./models/associations.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Make io accessible to routes
app.set('io', io);

app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id} from ${socket.handshake.address}`);
  
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on("connect_error", (error) => {
    console.log(`❌ Connection error: ${error.message}`);
  });

  // Handle ping/pong for connection health
  socket.on("ping", () => {
    socket.emit("pong");
  });
});

// --- API ROUTES ---
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/templates", scheduleTemplateRoutes);
app.use("/api/employee-schedules", employeeScheduleRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/schedule-notifications", scheduleNotificationRoutes);
app.use("/api/cleanup", cleanupRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/system", systemConfigRoutes);
app.use("/api/shift-templates", shiftTemplateRoutes);
app.use("/employees", employeeRoutes);

// Biometric app specific routes
import { getBiometricSchedules } from "./controllers/scheduleTemplateController.js";
app.get("/api/schedules/biometric", getBiometricSchedules);

// --- DATABASE SYNC ---
// Note: Database sync is handled by syncDatabase() function called below
// Using alter: false to prevent "Too many keys" MySQL error
sequelize
  .sync({ alter: false })
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
  
  // Note: Absent marking is handled by the biometric app
  // All attendance records originate from the biometric app and sync via API
});

export { io };