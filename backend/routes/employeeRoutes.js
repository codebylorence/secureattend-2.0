import express from "express";
import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  editEmployee
} from "../controllers/employeeController.js";

const router = express.Router();

router.get("/", getEmployees);
router.post("/", addEmployee);
router.put("/:id", editEmployee);
router.delete("/:id", deleteEmployee);

export default router;
