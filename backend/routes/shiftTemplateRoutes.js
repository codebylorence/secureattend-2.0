import express from "express";
import {
  getShiftTemplates,
  getShiftTemplate,
  addShiftTemplate,
  editShiftTemplate,
  removeShiftTemplate,
} from "../controllers/shiftTemplateController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /api/shift-templates - Get all shift templates
router.get("/", authenticateToken, getShiftTemplates);

// GET /api/shift-templates/:id - Get specific shift template
router.get("/:id", authenticateToken, getShiftTemplate);

// POST /api/shift-templates - Create new shift template (admin only)
router.post("/", authenticateToken, requireAdmin, addShiftTemplate);

// PUT /api/shift-templates/:id - Update shift template (admin only)
router.put("/:id", authenticateToken, requireAdmin, editShiftTemplate);

// DELETE /api/shift-templates/:id - Delete shift template (admin only)
router.delete("/:id", authenticateToken, requireAdmin, removeShiftTemplate);

export default router;