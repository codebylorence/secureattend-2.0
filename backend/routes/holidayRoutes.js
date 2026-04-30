import express from "express";
import {
  getHolidays,
  checkHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../controllers/holidayController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public read (biometric app + frontend need this without auth)
router.get("/", authenticateToken, getHolidays);
router.get("/check", authenticateToken, checkHoliday);

// Admin-only mutations
router.post("/", authenticateToken, requireAdmin, createHoliday);
router.put("/:id", authenticateToken, requireAdmin, updateHoliday);
router.delete("/:id", authenticateToken, requireAdmin, deleteHoliday);

export default router;
