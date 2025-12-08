import express from "express";
import {
  getEmployeeSchedules,
  getEmployeeSchedule,
  getDepartmentSchedules,
  assignSchedule,
  editEmployeeSchedule,
  removeEmployeeSchedule,
  removeDaysFromSchedule,
  getTodaysEmployeeSchedule,
  regenerateWeekly,
  getPublishedSchedules,
} from "../controllers/employeeScheduleController.js";

const router = express.Router();

router.get("/", getEmployeeSchedules);
router.get("/published", getPublishedSchedules); // For biometric app
router.get("/employee/:employee_id", getEmployeeSchedule);
router.get("/today/:employee_id", getTodaysEmployeeSchedule);
router.get("/department/:department", getDepartmentSchedules);
router.post("/assign", assignSchedule);
router.post("/regenerate-weekly", regenerateWeekly);
router.put("/:id", editEmployeeSchedule);
router.delete("/:id/days", removeDaysFromSchedule);
router.delete("/:id", removeEmployeeSchedule);

export default router;
