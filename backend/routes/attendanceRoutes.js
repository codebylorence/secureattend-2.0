import express from "express";
import {
  recordAttendance,
  getAttendances,
  getTodayAttendances,
  createTestAttendance,
  clearTestAttendance,
  assignOvertime,
  removeOvertime,
  getOvertimeAssignments,
  getOvertimeEligibleEmployees,
  updateOvertimeHours
} from "../controllers/attendanceController.js";
import { authenticateToken, requireAttendanceAccess, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/", recordAttendance);
router.get("/", authenticateToken, requireAttendanceAccess, getAttendances);
router.get("/today", authenticateToken, requireAttendanceAccess, getTodayAttendances);
router.post("/test", authenticateToken, requireAdmin, createTestAttendance); // Test endpoint - admin only
router.delete("/test", authenticateToken, requireAdmin, clearTestAttendance); // Clear test data - admin only

// Overtime management routes - attendance access required
router.get("/overtime/eligible", authenticateToken, requireAttendanceAccess, getOvertimeEligibleEmployees);
router.post("/overtime/assign", authenticateToken, requireAttendanceAccess, assignOvertime);
router.put("/overtime/hours", authenticateToken, requireAttendanceAccess, updateOvertimeHours);
router.delete("/overtime/:employee_id", authenticateToken, requireAttendanceAccess, removeOvertime);
router.get("/overtime", authenticateToken, requireAttendanceAccess, getOvertimeAssignments);

export default router;
