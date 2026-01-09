import express from "express";
import {
  recordAttendance,
  getAttendances,
  getTodayAttendances,
  createTestAttendance,
  clearTestAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/", recordAttendance);
router.get("/", getAttendances);
router.get("/today", getTodayAttendances);
router.post("/test", createTestAttendance); // Test endpoint
router.delete("/test", clearTestAttendance); // Clear test data

export default router;
