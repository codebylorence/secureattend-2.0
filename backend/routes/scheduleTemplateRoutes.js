import express from "express";
import {
  getTemplates,
  getPublishedTemplates,
  getDepartmentTemplates,
  getTemplate,
  addTemplate,
  editTemplate,
  removeTemplate,
  permanentlyRemoveTemplate,
  publishSchedules,
  getTemplateStats,
} from "../controllers/scheduleTemplateController.js";
import { authenticateToken, requireAdminOrTeamLeader, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getTemplates); // Get all templates (admin)
router.get("/stats", authenticateToken, requireAdmin, getTemplateStats); // Get template statistics
router.get("/published", getPublishedTemplates); // Get only published templates (ViewSchedules)
router.get("/department/:department", getDepartmentTemplates);
router.get("/:id", getTemplate);
router.post("/", authenticateToken, requireAdminOrTeamLeader, addTemplate);
router.put("/:id", authenticateToken, requireAdminOrTeamLeader, editTemplate);
router.delete("/:id", authenticateToken, requireAdminOrTeamLeader, removeTemplate);
router.delete("/:id/permanent", authenticateToken, requireAdmin, permanentlyRemoveTemplate); // Permanently delete template
router.post("/publish", authenticateToken, requireAdminOrTeamLeader, publishSchedules); // Publish all draft schedules

export default router;
