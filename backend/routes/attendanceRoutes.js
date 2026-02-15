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
  updateOvertimeHours,
  syncAttendanceFromBiometric,
  triggerMissedClockoutCheck
} from "../controllers/attendanceController.js";
import { authenticateToken, requireAttendanceAccess, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Health check endpoint to verify deployment version
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "overtime-fix-v4-FORCE-DEPLOY",
    overtimeLogic: "Eligible if: clocked in today (Present/Late) AND no overtime assigned yet",
    scheduleCheckRemoved: true,
    deployTimestamp: "2026-02-15T20:00:00Z"
  });
});

router.post("/", recordAttendance);
router.get("/", authenticateToken, requireAttendanceAccess, getAttendances);
router.get("/today", authenticateToken, requireAttendanceAccess, getTodayAttendances);
router.post("/test", authenticateToken, requireAdmin, createTestAttendance); // Test endpoint - admin only
router.delete("/test", authenticateToken, requireAdmin, clearTestAttendance); // Clear test data - admin only

// Biometric sync endpoint - no auth required (called by biometric app)
router.post("/sync-from-biometric", syncAttendanceFromBiometric);

// Manual trigger for missed clock-out check - admin only
router.post("/check-missed-clockouts", authenticateToken, requireAdmin, triggerMissedClockoutCheck);

// Overtime management routes - attendance access required
router.get("/overtime/eligible", authenticateToken, requireAttendanceAccess, getOvertimeEligibleEmployees);
router.post("/overtime/assign", authenticateToken, requireAttendanceAccess, assignOvertime);
router.put("/overtime/hours", authenticateToken, requireAttendanceAccess, updateOvertimeHours);
router.delete("/overtime/:employee_id", authenticateToken, requireAttendanceAccess, removeOvertime);
router.get("/overtime", authenticateToken, requireAttendanceAccess, getOvertimeAssignments);

export default router;
