import express from "express";
import {
  getSchedules,
  getTemplates,
  getDepartmentTemplates,
  getEmployeeSchedules,
  addSchedule,
  editSchedule,
  removeSchedule,
} from "../controllers/scheduleController.js";

const router = express.Router();

router.get("/", getSchedules);
router.get("/templates", getTemplates);
router.get("/templates/department/:department", getDepartmentTemplates);
router.get("/employee/:employee_id", getEmployeeSchedules);
router.post("/", addSchedule);
router.put("/:id", editSchedule);
router.delete("/:id", removeSchedule);

export default router;
