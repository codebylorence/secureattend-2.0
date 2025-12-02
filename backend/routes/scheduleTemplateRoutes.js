import express from "express";
import {
  getTemplates,
  getPublishedTemplates,
  getDepartmentTemplates,
  getTemplate,
  addTemplate,
  editTemplate,
  removeTemplate,
  publishSchedules,
} from "../controllers/scheduleTemplateController.js";

const router = express.Router();

router.get("/", getTemplates); // Get all templates (admin)
router.get("/published", getPublishedTemplates); // Get only published templates (ViewSchedules)
router.get("/department/:department", getDepartmentTemplates);
router.get("/:id", getTemplate);
router.post("/", addTemplate);
router.put("/:id", editTemplate);
router.delete("/:id", removeTemplate);
router.post("/publish", publishSchedules); // Publish all draft schedules

export default router;
