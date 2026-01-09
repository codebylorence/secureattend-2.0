import express from "express";
import { exportEmployees, exportAttendance, getSystemStats } from "../controllers/backupController.js";

const router = express.Router();

// Export employees data
router.get("/export/employees", exportEmployees);

// Export attendance data
router.get("/export/attendance", exportAttendance);

// Get system statistics
router.get("/system-stats", getSystemStats);

export default router;
