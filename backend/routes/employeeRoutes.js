import express from "express";
import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  editEmployee,
  getEmployeeById
} from "../controllers/employeeController.js";

const router = express.Router();

router.get("/", getEmployees);
router.post("/", addEmployee);
router.put("/:id", editEmployee);
router.delete("/:id", deleteEmployee);
router.get("/:employee_id", getEmployeeById);


export default router;
