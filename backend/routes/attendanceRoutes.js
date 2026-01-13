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

const router = express.Router();

router.post("/", recordAttendance);
router.get("/", getAttendances);
router.get("/today", getTodayAttendances);
router.post("/test", createTestAttendance); // Test endpoint
router.delete("/test", clearTestAttendance); // Clear test data

// Overtime management routes
router.get("/overtime/eligible", getOvertimeEligibleEmployees);
router.post("/overtime/assign", assignOvertime);
router.put("/overtime/hours", updateOvertimeHours);
router.delete("/overtime/:employee_id", removeOvertime);
router.get("/overtime", getOvertimeAssignments);

export default router;
