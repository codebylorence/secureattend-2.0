import {
  getPendingDrafts,
  getDraftsByEmployee,
  createDraft as createDraftService,
  updateDraft,
  deleteDraft,
  publishAllDrafts,
  cancelAllDrafts,
  getPendingDraftCount
} from "../services/scheduleDraftService.js";

// GET /api/schedule-drafts - Get all pending drafts
export const getDrafts = async (req, res) => {
  try {
    const drafts = await getPendingDrafts();
    res.status(200).json(drafts);
  } catch (error) {
    console.error("Error fetching drafts:", error);
    res.status(500).json({ message: "Error fetching drafts" });
  }
};

// GET /api/schedule-drafts/employee/:employeeId - Get drafts by employee
export const getEmployeeDrafts = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const drafts = await getDraftsByEmployee(employeeId);
    res.status(200).json(drafts);
  } catch (error) {
    console.error("Error fetching employee drafts:", error);
    res.status(500).json({ message: "Error fetching employee drafts" });
  }
};

// GET /api/schedule-drafts/count - Get pending draft count
export const getDraftCount = async (req, res) => {
  try {
    const count = await getPendingDraftCount();
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error fetching draft count:", error);
    res.status(500).json({ message: "Error fetching draft count" });
  }
};

// POST /api/schedule-drafts - Create new draft
export const createDraft = async (req, res) => {
  try {
    const draft = await createDraftService(req.body);
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('draft:created', draft);
    }
    
    res.status(201).json(draft);
  } catch (error) {
    console.error("Error creating draft:", error);
    res.status(500).json({ message: "Error creating draft" });
  }
};

// PUT /api/schedule-drafts/:id - Update draft
export const editDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const draft = await updateDraft(id, req.body);
    
    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }
    
    res.status(200).json(draft);
  } catch (error) {
    console.error("Error updating draft:", error);
    res.status(500).json({ message: "Error updating draft" });
  }
};

// DELETE /api/schedule-drafts/:id - Delete draft
export const removeDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDraft(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Draft not found" });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('draft:deleted', { id });
    }
    
    res.status(200).json({ message: "Draft deleted successfully" });
  } catch (error) {
    console.error("Error deleting draft:", error);
    res.status(500).json({ message: "Error deleting draft" });
  }
};

// POST /api/schedule-drafts/publish - Publish all pending drafts
export const publishDrafts = async (req, res) => {
  try {
    const { published_by } = req.body;
    const results = await publishAllDrafts(published_by);
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('drafts:published', results);
    }
    
    res.status(200).json({
      message: "Drafts published successfully",
      ...results
    });
  } catch (error) {
    console.error("Error publishing drafts:", error);
    res.status(500).json({ message: "Error publishing drafts" });
  }
};

// POST /api/schedule-drafts/cancel-all - Cancel all pending drafts
export const cancelDrafts = async (req, res) => {
  try {
    const count = await cancelAllDrafts();
    res.status(200).json({ 
      message: `Cancelled ${count} draft(s)`,
      count 
    });
  } catch (error) {
    console.error("Error cancelling drafts:", error);
    res.status(500).json({ message: "Error cancelling drafts" });
  }
};
