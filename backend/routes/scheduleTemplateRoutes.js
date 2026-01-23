import express from "express";
import {
  getTemplates,
  getPublishedTemplates,
  getDepartmentTemplates,
  getTemplate,
  addTemplate,
  editTemplate,
  removeTemplate,
  getTemplateStats,
  assignEmployees,
  removeEmployees,
  getBiometricSchedules,
} from "../controllers/scheduleTemplateController.js";
import { authenticateToken, requireAdminOrTeamLeader, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getTemplates); // Get all templates
router.get("/stats", authenticateToken, requireAdmin, getTemplateStats); // Get template statistics
router.get("/published", getPublishedTemplates); // Get all templates (backward compatibility)
router.get("/department/:department", getDepartmentTemplates);
router.get("/:id", getTemplate);
router.post("/", authenticateToken, requireAdminOrTeamLeader, addTemplate);
router.post("/assign-employees", authenticateToken, requireAdminOrTeamLeader, assignEmployees); // Assign employees to template
router.put("/:id", authenticateToken, requireAdminOrTeamLeader, editTemplate);
router.delete("/:id", authenticateToken, requireAdminOrTeamLeader, removeTemplate);
router.delete("/:id/employees", authenticateToken, requireAdminOrTeamLeader, removeEmployees); // Remove employees from template

export default router;