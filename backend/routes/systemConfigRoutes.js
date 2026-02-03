import express from "express";
import { getSystemConfig, updateSystemConfig, resetSystemConfig } from "../controllers/systemConfigController.js";
import { authenticateToken, requireAdmin, requireConfigRead } from "../middleware/auth.js";

const router = express.Router();

// Get system configuration (admin, warehouse admin, supervisor can read)
router.get("/config", authenticateToken, requireConfigRead, getSystemConfig);

// Update system configuration (HR admin only)
router.put("/config", authenticateToken, requireAdmin, updateSystemConfig);

// Reset system configuration to defaults (HR admin only)
router.post("/config/reset", authenticateToken, requireAdmin, resetSystemConfig);

export default router;