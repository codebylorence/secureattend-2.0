import express from "express";
import {
  getTemplates,
  getDepartmentTemplates,
  getTemplate,
  addTemplate,
  editTemplate,
  removeTemplate,
} from "../controllers/scheduleTemplateController.js";

const router = express.Router();

router.get("/", getTemplates);
router.get("/department/:department", getDepartmentTemplates);
router.get("/:id", getTemplate);
router.post("/", addTemplate);
router.put("/:id", editTemplate);
router.delete("/:id", removeTemplate);

export default router;
