import express from "express";
import {
  getEmployees,
  getEmployeesForBiometric,
  addEmployee,
  deleteEmployee,
  editEmployee,
  getEmployeeById,
  uploadPhoto,
  getFingerprintStatus,
  updateFingerprintStatus,
  testUserCreation,
  getTeamMembers,
} from "../controllers/employeeController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getEmployees);
router.get("/biometric", getEmployeesForBiometric); // Specific endpoint for biometric app
router.get("/fingerprint-status", getFingerprintStatus);
router.get("/test-user-creation", testUserCreation);
router.get("/team/:department", authenticateToken, getTeamMembers); // Team members by department
router.post("/", addEmployee);
router.put("/:id", editEmployee);
router.put("/:id/photo", uploadPhoto);
router.put("/:employeeId/fingerprint", updateFingerprintStatus); // Update fingerprint status
router.delete("/:id", deleteEmployee);
router.get("/:employee_id", getEmployeeById);


export default router;
