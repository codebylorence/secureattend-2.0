import express from "express";
import { cleanupInvalidAbsences, cleanupAllAbsences, cleanupOrphanedData } from "../controllers/cleanupController.js";

const router = express.Router();

// Clean up invalid absent records for today
router.delete("/invalid-absences", cleanupInvalidAbsences);

// Clean up all absent records (for testing)
router.delete("/all-absences", cleanupAllAbsences);

// Clean up orphaned data from deleted employees
router.post("/orphaned-data", cleanupOrphanedData);

export default router;
