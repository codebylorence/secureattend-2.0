import express from "express";
import { markTodayAbsent, markDateAbsent } from "../controllers/absentMarkingController.js";

const router = express.Router();

// Mark today's absences
router.post("/mark-today", markTodayAbsent);

// Mark absences for a specific date
router.post("/mark-date", markDateAbsent);

export default router;
