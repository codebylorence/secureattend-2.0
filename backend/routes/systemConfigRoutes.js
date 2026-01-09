import express from "express";
import { getSystemConfig, updateSystemConfig, resetSystemConfig } from "../controllers/systemConfigController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get system configuration (admin only)
router.get("/config", authenticateToken, requireAdmin, getSystemConfig);

// Update system configuration (admin only)
router.put("/config", authenticateToken, requireAdmin, updateSystemConfig);

// Reset system configuration to defaults (admin only)
router.post("/config/reset", authenticateToken, requireAdmin, resetSystemConfig);

export default router;