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
import { authenticateToken, requireAdminOrTeamLeader } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getEmployeeSchedules);
router.get("/published", getPublishedSchedules); // For biometric app
router.get("/employee/:employee_id", getEmployeeSchedule);
router.get("/today/:employee_id", getTodaysEmployeeSchedule);
router.get("/department/:department", getDepartmentSchedules);
router.post("/assign", authenticateToken, requireAdminOrTeamLeader, assignSchedule);
router.post("/regenerate-weekly", authenticateToken, requireAdminOrTeamLeader, regenerateWeekly);
router.put("/:id", authenticateToken, requireAdminOrTeamLeader, editEmployeeSchedule);
router.delete("/:id/days", authenticateToken, requireAdminOrTeamLeader, removeDaysFromSchedule);
router.delete("/:id", authenticateToken, requireAdminOrTeamLeader, removeEmployeeSchedule);

export default router;
