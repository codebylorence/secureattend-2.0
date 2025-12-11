import express from "express";
import {
  getPositions,
  getAllPositions,
  addPosition,
  updatePosition,
  deletePosition
} from "../controllers/positionController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public route - get active positions only (for registration form)
router.get("/", getPositions);

// Admin routes - require authentication
router.get("/all", authenticateToken, requireAdmin, getAllPositions);
router.post("/", authenticateToken, requireAdmin, addPosition);
router.put("/:id", authenticateToken, requireAdmin, updatePosition);
router.delete("/:id", authenticateToken, requireAdmin, deletePosition);

export default router;