import express from "express";
import {
  recordAttendance,
  getAttendances,
  getTodayAttendances
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/", recordAttendance);
router.get("/", getAttendances);
router.get("/today", getTodayAttendances);

export default router;
