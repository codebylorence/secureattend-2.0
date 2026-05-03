import express from "express";
import { getDTR, getAllDTR } from "../controllers/dtrController.js";
import { authenticateToken, requireAdmin, requireAttendanceAccess } from "../middleware/auth.js";

const router = express.Router();

// Single employee DTR
router.get("/", authenticateToken, requireAttendanceAccess, getDTR);

// Batch DTR — admin only
router.get("/all", authenticateToken, requireAdmin, getAllDTR);

export default router;
