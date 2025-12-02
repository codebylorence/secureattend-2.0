import express from "express";
import {
  getDrafts,
  getEmployeeDrafts,
  getDraftCount,
  createDraft,
  editDraft,
  removeDraft,
  publishDrafts,
  cancelDrafts
} from "../controllers/scheduleDraftController.js";

const router = express.Router();

// GET /api/schedule-drafts - Get all pending drafts
router.get("/", getDrafts);

// GET /api/schedule-drafts/count - Get pending draft count
router.get("/count", getDraftCount);

// GET /api/schedule-drafts/employee/:employeeId - Get drafts by employee
router.get("/employee/:employeeId", getEmployeeDrafts);

// POST /api/schedule-drafts - Create new draft
router.post("/", createDraft);

// POST /api/schedule-drafts/publish - Publish all pending drafts
router.post("/publish", publishDrafts);

// POST /api/schedule-drafts/cancel-all - Cancel all pending drafts
router.post("/cancel-all", cancelDrafts);

// PUT /api/schedule-drafts/:id - Update draft
router.put("/:id", editDraft);

// DELETE /api/schedule-drafts/:id - Delete draft
router.delete("/:id", removeDraft);

export default router;
