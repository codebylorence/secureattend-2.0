import express from "express";
import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  editEmployee,
  getEmployeeById,
  uploadPhoto
} from "../controllers/employeeController.js";

const router = express.Router();

router.get("/", getEmployees);
router.post("/", addEmployee);
router.put("/:id", editEmployee);
router.put("/:id/photo", uploadPhoto);
router.delete("/:id", deleteEmployee);
router.get("/:employee_id", getEmployeeById);


export default router;
