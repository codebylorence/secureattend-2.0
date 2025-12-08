import express from "express";
import { cleanupInvalidAbsences, cleanupAllAbsences } from "../controllers/cleanupController.js";

const router = express.Router();

// Clean up invalid absent records for today
router.delete("/invalid-absences", cleanupInvalidAbsences);

// Clean up all absent records (for testing)
router.delete("/all-absences", cleanupAllAbsences);

export default router;
